const ACTIONS = new Set(["dash", "disengage", "dodge", "hide", "grapple", "shove", "unarmed-strike"]);

export async function prepareBasicAction(actionId, pack) {
    if (!pack || !ACTIONS.has(actionId)) return null;
    const name = ["grapple", "shove", "unarmed-strike"].includes(actionId) ? "unarmed strike" : actionId;
    const index = await pack.getIndex();
    const entry = index.find(item => item.name?.toLowerCase() === name);
    if (!entry) return null;
    const document = await pack.getDocument(entry._id);
    if (!document) return null;
    const data = document.toObject();
    if (name === "unarmed strike" && actionId !== "unarmed-strike") {
        const identifiers = actionId === "grapple" ? ["grapple"] : ["shove-prone", "shove-push"];
        const activities = Object.entries(data.system?.activities ?? {}).filter(([, activity]) =>
            identifiers.includes(activity.midiProperties?.identifier));
        if (activities.length !== identifiers.length) return null;
        data.system.activities = Object.fromEntries(activities);
    }
    return data;
}

export async function useCompendiumBasicAction(actionId, actor) {
    const roll = globalThis.cat?.utils?.workflowUtils?.syntheticItemDataRoll;
    const pack = game.packs.get("chris-premades.CPRMisc2024");
    if (!game.modules.get("cat")?.active || !game.modules.get("chris-premades")?.active || !roll) return false;
    const data = await prepareBasicAction(actionId, pack);
    if (!data) return false;
    if (actionId === "shove" || actionId === "unarmed-strike") {
        const entries = Object.entries(data.system.activities);
        const selection = await foundry.applications.api.DialogV2.wait({
            window: { title: game.i18n.localize(`crux.action.${actionId}`) },
            buttons: entries.map(([id, activity]) => {
                const key = `crux.action.${activity.midiProperties?.identifier}`;
                return { action: id, label: game.i18n.has(key) ? game.i18n.localize(key) : activity.name, callback: () => id };
            }),
            rejectClose: false
        });
        if (!selection) return true;
        data.system.activities = { [selection]: data.system.activities[selection] };
    }
    const targets = Array.from(game.user.targets ?? [], token => token.document ?? token);
    await roll(data, actor, targets, { userId: game.user.id, fast: false });
    return true;
}
