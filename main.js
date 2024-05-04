const puppeteer = require('puppeteer-extra');
const readlineSync = require('readline-sync');
const fs = require('fs');
const ExcelJS = require('exceljs');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

(async () => {
  puppeteer.use(StealthPlugin());

  const url = readlineSync.question('Masukkan URL: ');
  const numTabs = parseInt(readlineSync.question('Masukkan jumlah tab: '));

  const browser = await puppeteer.launch({ headless: true });
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data');

  worksheet.columns = [
    { header: 'WebSocket URL', key: 'webSocketUrl' },
    { header: 'Sec-WebSocket-Protocol', key: 'secWebSocketProtocol' }
  ];

  for (let i = 0; i < numTabs; i++) {
    console.log(`Membuka tab ${i + 1} dari ${numTabs}`);

    const page = await browser.newPage();

    const client = await page.target().createCDPSession();
    await client.send('Network.enable');

    const data = [];

    client.on('Network.webSocketCreated', ({ requestId, url }) => {
      console.log('WebSocket URL:', url);
      data.push({ webSocketUrl: url });
    });

    client.on('Network.webSocketWillSendHandshakeRequest', ({ requestId, request }) => {
      console.log('Sec-WebSocket-Protocol:', request.headers['Sec-WebSocket-Protocol']);
      data[data.length - 1].secWebSocketProtocol = request.headers['Sec-WebSocket-Protocol'];
    });

    await page.goto(url);
    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
      await page.waitForSelector('.m-LiveList-CardTips');
      await page.click('.m-LiveList-CardTips');
      console.log('Element clicked successfully.');
    } catch (error) {
      await page.evaluate(() => {
        const element = document.querySelector('.live-tag');
        if (element) {
          element.click();
          console.log('Element .live-tag clicked successfully using JavaScript.');
        } else {
          console.error('Element .live-tag not found in the DOM.');
        }
      });
    }

    await new Promise(resolve => setTimeout(resolve, 3000));

    data.forEach(row => {
      worksheet.addRow(row);
    });

    await page.close();
  }

  console.log(`Proses selesai. Menutup browser...`);
  await browser.close();

  const fileName = 'data_tab.xlsx';
  await workbook.xlsx.writeFile(fileName);

  console.log(`Data disimpan dalam file Excel dengan nama ${fileName}.`);
})();
