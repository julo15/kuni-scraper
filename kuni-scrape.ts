import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import * as notifier from 'node-notifier';

const URLS: string[] = [
    'https://www.evga.com/products/product.aspx?pn=10G-P5-3881-KR',
    'https://www.evga.com/products/product.aspx?pn=10G-P5-3895-KR',
    'https://www.evga.com/products/product.aspx?pn=10G-P5-3897-KR',
    'https://www.evga.com/products/product.aspx?pn=10G-P5-3883-KR',
    'https://www.evga.com/products/product.aspx?pn=10G-P5-3885-KR',
    'https://www.newegg.com/p/pl?d=RTX+3080&N=100007709%20601357282&isdeptsrh=1',
];

type StockResult = {
    available: boolean;
    product: string;
    url?: string;
};

const evgaGetProductStock = (dom: JSDOM): StockResult => ({
    available: dom.window.document.querySelector('#LFrame_pnlOutOfStock') === null,
    product: dom.window.document.querySelector('#LFrame_lblProductName').innerHTML,
});

const neweggGetProductStock = (dom: JSDOM): StockResult => {
    // Assumes the link is a search results page
    let queryItem = '.item-container .item-info';
    let promoTexts = dom.window.document.querySelectorAll(`${queryItem} .item-promo`);
    let infos = dom.window.document.querySelectorAll(`${queryItem} .item-title`);
    var result: StockResult = {
        available: false,
        product: 'NewEgg',
    };
    promoTexts.forEach((node, index) => {
        let available = !node.innerHTML.includes('OUT OF STOCK');
        let url = infos.item(index).href;
        let product = infos.item(index).innerHTML;
        console.log(`Product: ${product}\nLink: ${url}\nAvailable: ${available}\n`);
        if (available) {
            result = {
                available: true,
                product,
                url,
            };
        }
    });
    return result;
};

const getProductStock = async (url: string): Promise<StockResult | null> => {
    try {
        const response = await fetch(url);
        const text = await response.text();
        const dom = await new JSDOM(text);
        if (url.startsWith('https://www.evga.com')) {
            return evgaGetProductStock(dom);
        } 
        if (url.startsWith('https://www.newegg.com')) {
            return neweggGetProductStock(dom);
        }
    } catch (e) {
        console.log(`Failed checking url: ${url}\nError: ${e}`);
    }

    return null;
};

const checkUrl = async (queryUrl: string): Promise<void> => {
    const result = await getProductStock(queryUrl);
    var text: string;
    if (result) {
        const { available, product, url } = result;
        text = `Product: ${product}\nAvailable: ${available}`;
        if (available) {
            notifier.notify({
                title: 'GO GO GO CLICK ME BUY NOW!!!',
                message: `${product}`,
                open: url || queryUrl,
            });
        }
    } else {
        text = `Failed: ${queryUrl}`;
    }
    console.log(`${text}\n\n`);
};

const checkAllUrls = async (urls: string[]) => {
    const promises = urls.map(url => checkUrl(url));
    return Promise.all(promises);
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const main = async () => {
    let url = process.argv[2];
    if (url) {
        console.log('Checking passed-in url');
        await checkUrl(url);
        console.log('Done checking url');
        return;
    }

    const wait = 10;
    while (true) {
        console.log(`Starting iteration: ${new Date()}`);
        await checkAllUrls(URLS);
        console.log(`Ending iteration: ${new Date()}`);
        console.log(`Waiting ${wait} seconds before trying again...`);
        console.log('Press ctrl+c to quit.');
        await sleep(wait * 1000);
    }
};



main();
