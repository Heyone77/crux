import assert from "node:assert/strict";
import { test } from "node:test";
import Injector from "../scripts/utils/CruxItemFormInjector.js";

// DOM host boundary: distinguish a navigation link from a tab's content pane.
// A broad [data-tab] lookup deliberately returns the link, as in a partial render.
function sheetFixture({ pane = "core", value = "hide" } = {}) {
    const inserts = [];
    let inserted = false;
    const navigation = {
        querySelector: () => null,
        querySelectorAll: () => [],
        insertAdjacentHTML: (position, html) => inserts.push({ target: "navigation", position, html })
    };
    const content = {
        querySelector: () => inserted ? {} : null,
        querySelectorAll: () => [],
        insertAdjacentHTML(position, html) {
            inserts.push({ target: "content", position, html });
            inserted = true;
        }
    };
    const html = {
        querySelector(selector) {
            if (selector === '[data-tab="details"]') return navigation;
            if (pane === "core" && selector.includes('section.tab[data-tab="details"]')) return content;
            if (pane === "tidy" && selector.includes('[data-tab-contents-for="details"]')) return content;
            return null;
        }
    };
    const app = { document: { documentName: "Item", type: "weapon", getFlag: () => value }, element: html };
    return { app, html, inserts };
}

test("a partial item render never inserts Crux settings into the details navigation link", () => {
    const { app, html, inserts } = sheetFixture({ pane: null });
    Injector._onRenderItemSheet(app, html);
    assert.deepEqual(inserts, []);
});

for (const pane of ["core", "tidy"]) {
    test(`${pane} details pane receives one visibility control and preserves its stored value`, () => {
        const { app, html, inserts } = sheetFixture({ pane });
        Injector._onRenderItemSheet(app, html);
        Injector._onRenderItemSheet(app, html);
        assert.equal(inserts.length, 1);
        assert.equal(inserts[0].target, "content");
        assert.match(inserts[0].html, /value="hide" selected/);
    });
}

test("generic application renders inject settings for Item sheets only", () => {
    const handlers = new Map();
    globalThis.Hooks = { on: (name, callback) => handlers.set(name, callback) };
    Injector.init();
    const { app, inserts } = sheetFixture({ pane: "tidy" });
    handlers.get("renderApplication")(app);
    assert.equal(inserts.length, 1);

    const actorSheet = sheetFixture({ pane: "tidy" });
    actorSheet.app.document.documentName = "Actor";
    handlers.get("renderApplication")(actorSheet.app);
    assert.equal(actorSheet.inserts.length, 0);
});

test("ApplicationV2 renders use the supplied pending item sheet element", () => {
    const handlers = new Map();
    globalThis.Hooks = { on: (name, callback) => handlers.set(name, callback) };
    Injector.init();
    const { app, html, inserts } = sheetFixture({ pane: "tidy" });
    app.element = null;
    assert.equal(typeof handlers.get("renderApplicationV2"), "function");
    handlers.get("renderApplicationV2")(app, html);
    assert.equal(inserts.length, 1);
});

test("legacy jQuery-wrapped item sheets receive the visibility control", () => {
    const { app, html, inserts } = sheetFixture();
    Injector._onRenderItemSheet(app, { 0: html, length: 1 });
    assert.equal(inserts.length, 1);
    assert.equal(inserts[0].target, "content");
});

test("an indexed native form is retained as the sheet root", () => {
    const { app, html, inserts } = sheetFixture();
    html[0] = { querySelector: () => null };
    Injector._onRenderItemSheet(app, html);
    assert.equal(inserts.length, 1);
    assert.equal(inserts[0].target, "content");
});
