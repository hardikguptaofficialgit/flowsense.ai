import { chromium } from "playwright";
import puppeteer from "puppeteer";

async function verifyPlaywright() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent("<title>playwright-ok</title><main>ok</main>");
    return { engine: "playwright", title: await page.title(), version: browser.version() };
  } finally {
    await browser.close();
  }
}

async function verifyPuppeteer() {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent("<title>puppeteer-ok</title><main>ok</main>");
    return { engine: "puppeteer", title: await page.title(), version: await browser.version() };
  } finally {
    await browser.close();
  }
}

const results = await Promise.all([verifyPlaywright(), verifyPuppeteer()]);
console.log(JSON.stringify(results, null, 2));
