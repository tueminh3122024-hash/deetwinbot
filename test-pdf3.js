const { PDFParse } = require('pdf-parse');
async function test() {
  const parser = new PDFParse();
  console.log('Parser instance created');
}
test();
