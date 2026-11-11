import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { prepareBasicAction, useCompendiumBasicAction } from "../scripts/utils/CruxBasicActions.js";

test("unarmed strike offers all four CPR 2024 activities", async () => {
    const activities = Object.fromEntries(["unarmed-strike", "grapple", "shove-prone", "shove-push"].map(id => [id, { name: id, midiProperties: { identifier: id } }]));
    const pack = { async getIndex() { return [{ _id: "id", name: "Unarmed Strike" }]; }, async getDocument() { return { toObject: () => ({ system: { activities } }) }; } };
    const result = await prepareBasicAction("unarmed-strike", pack);
    assert.deepEqual(Object.keys(result.system.activities), Object.keys(activities));
});

test("unarmed action menu translations are nested where Foundry resolves them", async () => {
    for (const lang of ["en", "ru", "pl"]) {
        const data = JSON.parse(await readFile(new URL(`../lang/${lang}.json`, import.meta.url), "utf8"));
        for (const key of ["unarmed-strike", "shove-prone", "shove-push"]) assert.ok(data.crux.action[key], `${lang}: ${key}`);
    }
});

test("loads each basic action from the 2024 CPR compendium", async () => {
    for (const action of ["dash", "disengage", "dodge", "hide", "grapple", "shove"]) {
        const requested = [];
        const activities = {
            one: { name: "Grapple", midiProperties: { identifier: "grapple" } },
            two: { name: "Shove (Prone)", midiProperties: { identifier: "shove-prone" } },
            three: { name: "Shove (Push)", midiProperties: { identifier: "shove-push" } }
        };
        const pack = { async getIndex() { return [{ _id: "id", name: ["grapple", "shove"].includes(action) ? "Unarmed Strike" : action }]; }, async getDocument(id) { requested.push(id); return { toObject: () => ({ system: { activities } }) }; } };
        const result = await prepareBasicAction(action, pack);
        assert.deepEqual(requested, ["id"]);
        assert.ok(result);
        if (action === "grapple") assert.deepEqual(Object.keys(result.system.activities), ["one"]);
        if (action === "shove") assert.deepEqual(Object.keys(result.system.activities), ["two", "three"]);
    }
});

test("runs shove for the actor and selected targets using the chosen 2024 activity", async () => {
    const actor = { id: "actor" };
    const target = { uuid: "Scene.test.Token.target" };
    let rolled;
    globalThis.game = {
        system: { id: "dnd5e" }, user: { id: "user", targets: new Set([{ document: target }]) },
        modules: new Map([["cat", { active: true }], ["chris-premades", { active: true }]]),
        packs: new Map([["chris-premades.CPRMisc2024", {
            async getIndex() { return [{ _id: "id", name: "Unarmed Strike" }]; },
            async getDocument() { return { toObject: () => ({ system: { activities: {
                prone: { name: "Prone", midiProperties: { identifier: "shove-prone" } },
                push: { name: "Push", midiProperties: { identifier: "shove-push" } }
            } } }) }; }
        }]]), i18n: { localize: value => value, has: () => true }
    };
    globalThis.foundry = { applications: { api: { DialogV2: { wait: async () => "push" } } } };
    globalThis.cat = { utils: { workflowUtils: { syntheticItemDataRoll: async (...args) => { rolled = args; } } } };
    assert.equal(await useCompendiumBasicAction("shove", actor), true);
    assert.deepEqual(Object.keys(rolled[0].system.activities), ["push"]);
    assert.equal(rolled[1], actor);
    assert.deepEqual(rolled[2], [target]);
    assert.equal(rolled[3].fast, false);
});

test("missing compendium actions or required activities return null", async () => {
    assert.equal(await prepareBasicAction("dodge", null), null);
    const pack = { async getIndex() { return [{ _id: "1", name: "Unarmed Strike" }]; }, async getDocument() { return { toObject: () => ({ system: { activities: {} } }) }; } };
    assert.equal(await prepareBasicAction("grapple", pack), null);
    assert.equal(await prepareBasicAction("unknown", pack), null);
});
