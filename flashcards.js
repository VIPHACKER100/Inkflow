/**
 * Flashcards & Study Mode Module
 * Functions: extractFlashcards, toggleStudyMode, loadFlashcardsFromText,
 *            openFlashcardsModal, closeFlashcardsModal, renderFlashcard,
 *            flipFlashcard, nextFlashcard, prevFlashcard
 * Depends on: window.S (state), window.TextLayout.parseRichSyntax
 * Extracted from index.js (docs/roadmap.md Phase 1).
 */
(function () {
  'use strict';

  let studyModeActive = false;
  let flashcards = [];
  let currentFlashcardIdx = 0;
  let flashcardFlipped = false;

  // Pure: pull Q:/A: pairs out of raw text (fallback when parseRichSyntax finds none)
  function extractFlashcards(text) {
    const cards = [];
    const lines = String(text || '').split('\n');
    let currentQ = null;
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^Q[:.]\s/.test(trimmed)) {
        currentQ = trimmed.replace(/^Q[:.]\s*/, '');
      } else if (/^A[:.]\s/.test(trimmed) && currentQ) {
        cards.push({ question: currentQ, answer: trimmed.replace(/^A[:.]\s*/, '') });
        currentQ = null;
      }
    }
    return cards;
  }

  function loadFlashcardsFromText() {
    flashcards = [];
    currentFlashcardIdx = 0;
    flashcardFlipped = false;
    const text = (window.S && window.S.text) || '';
    const { flashcards: parsed } = window.TextLayout.parseRichSyntax(text);
    if (parsed && parsed.length > 0) {
      flashcards = parsed;
    }
    // Also extract from Q:/A: patterns if parseRichSyntax didn't catch them
    if (flashcards.length === 0) {
      flashcards = extractFlashcards(text);
    }
  }

  function toggleStudyMode() {
    studyModeActive = !studyModeActive;
    document.body.classList.toggle('study-mode', studyModeActive);
    if (studyModeActive) {
      loadFlashcardsFromText();
      if (flashcards.length > 0) {
        openFlashcardsModal();
      } else {
        alert('No flashcards found. Use Q: and A: format in your text:\n\nQ: What is photosynthesis?\nA: The process by which plants convert light to energy.');
      }
    } else {
      closeFlashcardsModal();
    }
  }

  function openFlashcardsModal() {
    if (flashcards.length === 0) return;
    document.getElementById('flashcards-modal').classList.remove('hidden');
    currentFlashcardIdx = 0;
    renderFlashcard();
  }

  function closeFlashcardsModal() {
    document.getElementById('flashcards-modal').classList.add('hidden');
  }

  function renderFlashcard() {
    if (flashcards.length === 0) return;
    const fc = flashcards[currentFlashcardIdx];
    document.getElementById('flashcard-counter').textContent = `${currentFlashcardIdx + 1} / ${flashcards.length}`;
    document.getElementById('flashcard-front').textContent = fc.question;
    document.getElementById('flashcard-back').textContent = fc.answer;
    const inner = document.getElementById('flashcard-inner');
    inner.style.transform = flashcardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
    document.getElementById('flashcard-hint').textContent = flashcardFlipped ? 'Click to see question' : 'Click to flip';
  }

  function flipFlashcard() {
    flashcardFlipped = !flashcardFlipped;
    renderFlashcard();
  }

  function nextFlashcard() {
    if (flashcards.length === 0) return;
    flashcardFlipped = false;
    currentFlashcardIdx = (currentFlashcardIdx + 1) % flashcards.length;
    renderFlashcard();
  }

  function prevFlashcard() {
    if (flashcards.length === 0) return;
    flashcardFlipped = false;
    currentFlashcardIdx = (currentFlashcardIdx - 1 + flashcards.length) % flashcards.length;
    renderFlashcard();
  }

  if (typeof window !== 'undefined') {
    // Escape exits Study Mode when no modal is open (the app-wide Escape handler
    // in index.js closes open modals first — defer to it while this modal shows).
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !studyModeActive) return;
      const modal = document.getElementById('flashcards-modal');
      if (modal && !modal.classList.contains('hidden')) return;
      toggleStudyMode();
    });

    window.Flashcards = {
      extractFlashcards,
      toggleStudyMode,
      loadFlashcardsFromText,
      openFlashcardsModal,
      closeFlashcardsModal,
      renderFlashcard,
      flipFlashcard,
      nextFlashcard,
      prevFlashcard,
    };
    // Inline onclick handlers in index.html resolve these as globals
    window.toggleStudyMode = toggleStudyMode;
    window.closeFlashcardsModal = closeFlashcardsModal;
    window.flipFlashcard = flipFlashcard;
    window.nextFlashcard = nextFlashcard;
    window.prevFlashcard = prevFlashcard;
  }

  // Export for use in Node.js tests
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { extractFlashcards };
  }
})();
