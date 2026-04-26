const { PDFParse } = require('pdf-parse');
async function test() {
  const fs = require('fs');
  // Just test instantiating it, maybe it has a static method
  console.log(Object.getOwnPropertyNames(PDFParse.prototype));
  console.log(Object.getOwnPropertyNames(PDFParse));
}
test();
