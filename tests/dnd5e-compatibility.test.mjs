import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

// Foundry supplies these APIs in the browser. Keep the module code real and
// replace only the host boundaries needed by these compatibility regressions.
globalThis.foundry = {
    applications: { api: { ApplicationV2: class {}, HandlebarsApplicationMixin: base => base } },
    utils: { getProperty: (object, path) => path.split(".").reduce((value, key) => value?.[key], object) }
};
const { default: Effects } = await import("../scripts/apps/CruxEffectsAppV2.js");
const { default: Movement } = await import("../scripts/apps/CruxMovementAppV2.js");
const { default: Adapter } = await import("../scripts/systems/dnd5e/CruxDnd5eSystemAdapter.js");
const { default: Utils } = await import("../scripts/utils/CruxUtilityManager.js");
const { default: HooksManager } = await import("../scripts/hooks/CruxHooksManager.js");

beforeEach(() => {
    globalThis.CONFIG = { DND5E: { conditionTypes: { exhaustion: { levels: 6 } } } };
    globalThis.game = {
        system: { id: "dnd5e", version: "6.0.6" },
        keyboard: { downKeys: new Set() },
        keybindings: { get: (_scope, action) => action === "skipDialogNormal" ? [{ key: "Shift" }] : [] },
        settings: { get: () => true }
    };
    globalThis.canvas = { tokens: { controlled: [] } };
    Effects.activeInstance = null;
});

function statusEvent(statusId = "exhaustion") {
    return { currentTarget: { dataset: { statusId } }, preventDefault() {}, stopPropagation() {} };
}

test("leveled conditions increment on click and decrement on right click", async () => {
    const options = [];
    const app = new Effects({
        effects: [{ statuses: new Set(["exhaustion"]), system: { level: 2 } }],
        async toggleStatusEffect(_id, config) { options.push(config); }
    });
    app.render = () => {};
    await app._onToggleEffect(statusEvent());
    await app._onContextMenu(statusEvent());
    assert.deepEqual(options, [{ levels: 1 }, { levels: -1 }]);
});

test("right click cannot create a leveled condition at level zero", async () => {
    let calls = 0;
    const app = new Effects({ effects: [], async toggleStatusEffect() { calls++; } });
    app.render = () => {};
    await app._onContextMenu(statusEvent());
    assert.equal(calls, 0);
});

test("ordinary conditions retain the right-click overlay behavior", async () => {
    let options;
    const app = new Effects({ async toggleStatusEffect(_id, config) { options = config; } });
    app.render = () => {};
    await app._onContextMenu(statusEvent("prone"));
    assert.deepEqual(options, { overlay: true });
});

test("dnd5e 5 retains status toggles even though its exhaustion config declares levels", async () => {
    game.system.version = "5.3.3";
    const options = [];
    const app = new Effects({ effects: [], async toggleStatusEffect(_id, config) { options.push(config); } });
    app.render = () => {};
    await app._onToggleEffect(statusEvent());
    await app._onContextMenu(statusEvent());
    assert.deepEqual(options, [{ overlay: false }, { overlay: true }]);
});

for (const [name, movement] of [
    ["6.0", { speeds: { walk: 30, fly: 60, teleport: 40 } }],
    ["legacy", { walk: 30, fly: 60, teleport: 40 }]
]) {
    test(`${name} speeds appear in both the tray and movement flyout`, () => {
        const adapter = new Adapter();
        const flyout = new Movement({ system: { attributes: { movement } } });
        for (const [action, expected] of [["walk", 30], ["fly", 60], ["teleport", 40], ["crawl", 15], ["swim", 15]]) {
            assert.equal(adapter.getMovementAmount(action, movement), expected, `tray ${action}`);
            assert.equal(flyout._getMovementAmount(action), expected, `flyout ${action}`);
        }
        assert.equal(adapter.getMovementAmount("speed", movement), 30);
        assert.equal(flyout._getMovementAmount(null), 30);
    });
}

test("normal item use keeps the system configuration dialog enabled", async () => {
    let args;
    globalThis.fromUuidSync = () => ({ system: {}, use: (...values) => { args = values; } });
    await Utils.activateItem("Item.test", null, { shiftKey: false });
    assert.equal(args[1].configure, true);
});

test("pre-activity dnd5e still receives configure in the legacy item options", async () => {
    game.system.version = "3.3.1";
    let args;
    globalThis.fromUuidSync = () => ({ system: {}, use: (...values) => { args = values; } });
    await Utils.activateItem("Item.test", null, { shiftKey: true });
    assert.equal(args[0].configure, false);
    assert.equal(args.length, 1);
});

for (const branch of ["explicit activity", "first activity", "item"]) {
    test(`${branch} passes the skip-dialog choice through the system dialog argument`, async () => {
        let args;
        const activity = { id: "attack", use: (...values) => { args = values; return "used"; } };
        const item = {
            system: { activities: new Map([["attack", activity]]) },
            getFlag() {},
            use: (...values) => { args = values; return "used"; }
        };
        globalThis.fromUuidSync = () => item;
        const event = { shiftKey: true, fromCrux: branch !== "item" };
        assert.equal(await Utils.activateItem("Item.test", branch === "explicit activity" ? "attack" : null, event), "used");
        assert.equal(args[1]?.configure, false);
        assert.equal(args[0].event, event);
    });
}

test("an ActiveEffect change refreshes the open status flyout", async () => {
    class Actor {}
    CONFIG.Actor = { documentClass: Actor };
    const actor = new Actor();
    const token = { actor };
    let renders = 0;
    const app = new Effects(actor, token);
    app.rendered = true;
    app.render = () => { renders++; };
    canvas.tokens.controlled = [token];
    game.crux = { app: { render() {} }, state: { isActorActive: candidate => candidate === actor } };
    HooksManager._renderForActiveEffect({ parent: actor });
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(renders, 1);
});

test("effect changes for another active actor do not replace the open flyout actor", async () => {
    class Actor {}
    CONFIG.Actor = { documentClass: Actor };
    const shownActor = new Actor();
    shownActor.uuid = "Actor.shown";
    const changedActor = new Actor();
    changedActor.uuid = "Actor.changed";
    const app = new Effects(shownActor);
    app.rendered = true;
    let renders = 0;
    app.render = () => { renders++; };
    canvas.tokens.controlled = [{ actor: changedActor }];
    game.crux = { app: { render() {} }, state: { isActorActive: () => true } };
    HooksManager._renderForActiveEffect({ parent: changedActor });
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(app.actor, shownActor);
    assert.equal(renders, 0);
});
