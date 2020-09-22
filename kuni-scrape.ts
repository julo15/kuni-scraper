import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import * as notifier from 'node-notifier';

const URLS: string[] = [
    'https://www.evga.com/products/product.aspx?pn=10G-P5-3881-KR',
    'https://www.evga.com/products/product.aspx?pn=10G-P5-3895-KR',
    'https://www.evga.com/products/product.aspx?pn=10G-P5-3897-KR',
    'https://www.evga.com/products/product.aspx?pn=10G-P5-3883-KR',
    'https://www.evga.com/products/product.aspx?pn=10G-P5-3885-KR',
];

type StockResult = {
    available: boolean;
    product: string;
};

const evgaGetProductStock = (dom: JSDOM): StockResult => ({
    available: dom.window.document.querySelector('#LFrame_pnlOutOfStock') === null,
    product: dom.window.document.querySelector('#LFrame_lblProductName').innerHTML,
});

const getProductStock = async (url: string): Promise<StockResult | null> => {
    const response = await fetch(url);
    const text = await response.text();
    const dom = await new JSDOM(text);
    if (url.startsWith('https://www.evga.com')) {
        return evgaGetProductStock(dom);
    } 

    return null;
};

const checkUrl = async (url: string): Promise<void> => {
    const result = await getProductStock(url);
    var text: string;
    if (result) {
        const { available, product } = result;
        text = `Product: ${product}\nAvailable: ${available}`;
        if (available) {
            notifier.notify({
                title: 'GO GO GO CLICK ME BUY NOW!!!',
                message: `${product}`,
                open: url,
            });
        }
    } else {
        text = `Failed: ${url}`;
    }
    console.log(`${text}\n\n`);
};

const checkAllUrls = async (urls: string[]) => {
    const promises = urls.map(url => checkUrl(url));
    return Promise.all(promises);
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const main = async () => {
    const wait = 2;
    while (true) {
        console.log(`Starting iteration: ${new Date()}`);
        await checkAllUrls(URLS);
        console.log(`Ending iteration: ${new Date()}`);
        console.log(`Waiting ${wait} minutes before trying again...`);
        console.log('Press ctrl+c to quit.');
        await sleep(wait * 60 * 1000);
    }
};



main();
