const { PDFParse } = require('pdf-parse');
async function test() {
  const parser = new PDFParse({ data: Buffer.from('dummy') });
  console.log('Parser instance created');
}
test();
