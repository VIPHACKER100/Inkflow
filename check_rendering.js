const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  
  await page.goto('http://127.0.0.1:5500/');
  
  // Wait a moment for JS to run
  await page.waitForTimeout(2000);
  
  const result = await page.evaluate(() => {
    const res = {};
    if (window.layerCompositor) {
      res.layerCompositor = true;
      res.width = window.layerCompositor.width;
      res.height = window.layerCompositor.height;
      const stack = window.layerCompositor.getStack(0);
      res.layers = stack.layers.map(l => ({
        name: l.name,
        width: l.canvas.width,
        height: l.canvas.height
      }));
    }
    
    if (window.pages && window.pages.length > 0) {
      const c = window.pages[0];
      res.canvas = {
        width: c.width,
        height: c.height,
        rendered: c.dataset.rendered
      };
      
      // Let's check pixel data of canvas
      const ctx = c.getContext('2d');
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      
      let allZero = true;
      let nonZeroCount = 0;
      for (let i=0; i<data.length; i+=4) {
        if (data[i] !== 0 || data[i+1] !== 0 || data[i+2] !== 0 || data[i+3] !== 0) {
          allZero = false;
          nonZeroCount++;
        }
      }
      res.canvasPixels = { allZero, nonZeroCount };
    }
    
    // Check text input
    const ta = document.getElementById('text-input');
    res.textarea = ta ? ta.value : null;
    
    // Check queue
    res.queueLength = window.currentRenderQueue ? window.currentRenderQueue.length : -1;
    
    return res;
  });
  
  console.log(JSON.stringify(result, null, 2));
  
  await browser.close();
})();
