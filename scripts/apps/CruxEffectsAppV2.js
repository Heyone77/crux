const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
import CruxAnchoredFlyout from "../utils/CruxAnchoredFlyout.js";
import CruxDnd5eAccess from "../runtime/dnd5e/CruxDnd5eAccess.js";

export default class CruxEffectsAppV2 extends HandlebarsApplicationMixin(ApplicationV2) {
    static activeInstance = null;
    constructor(actor, token, event) {
        super();
        this.actor = actor;
        this.token = token;
        this.anchorEvent = event;
        this.anchorTarget = event?.currentTarget;
        CruxEffectsAppV2.activeInstance = this;
    }
    static updateInstance(actor, token) {
        if (CruxEffectsAppV2.activeInstance?.rendered) {
            CruxEffectsAppV2.activeInstance.actor = actor;
            CruxEffectsAppV2.activeInstance.token = token;
            CruxEffectsAppV2.activeInstance.render();
        }
    }
    static DEFAULT_OPTIONS = {
        id: "crux-effects",
        classes: ["crux-effects", "crux-effects-small", "crux-flyout"],
        popOut: false,
        minimizable: false,
        resizable: false,
        headerButtons: [],
        position: {
            width: 200,
            height: "auto"
        },
        form: {
            closeOnSubmit: false
        },
        window: {
            title: "crux.status-effects"
        }
    };

    static PARTS = {
        effects: {
            template: "modules/crux/templates/flyouts/crux-status-effects-flyout.hbs"
        }
    };

    async _prepareContext(options) {
        const choices = {};
        for (const status of CONFIG.statusEffects) {
            if ((status.hud === false) || 
                ((foundry.utils.getType(status.hud) === "Object") && 
                (status.hud.actorTypes?.includes(this.actor.type) === false))) {
                continue;
            }
            if (!status.img && !status.icon) continue;
            choices[status.id] = {
                _id: status._id,
                id: status.id,
                title: game.i18n.localize(status.name ?? status.label),
                src: status.img ?? status.icon,
                isActive: false,
                isOverlay: false
            };
        }
        const activeEffects = this.actor?.effects || [];
        for (const effect of activeEffects) {
            for (const statusId of effect.statuses) {
                const status = choices[statusId];
                if (!status) continue;
                if (status._id) {
                    if (status._id !== effect.id) continue;
                } else {
                    if (effect.statuses.size !== 1) continue;
                }
                status.isActive = true;
                if (effect.getFlag("core", "overlay")) status.isOverlay = true;
                break;
            }
        }
        for (const status of Object.values(choices)) {
            status.cssClass = [
                status.isActive ? "active" : null,
                status.isOverlay ? "overlay" : null
            ].filterJoin(" ");
        }
        const result = {
            effects: Object.values(choices)
        };
        return result;
    }
    async _onToggleEffect(event, {overlay = false} = {}) {
        event.preventDefault();
        event.stopPropagation();        
        if (!this.actor) {
            ui.notifications.warn("No actor available");
            return;
        }        
        const statusId = event.currentTarget.dataset.statusId;
        const hasLevels = CruxDnd5eAccess.supportsConditionLevels()
            && Number.isFinite(CONFIG.DND5E?.conditionTypes?.[statusId]?.levels);
        // In dnd5e 6, toggling a leveled condition applies a delta. A negative
        // delta without an existing effect falls through to the core toggle.
        if (hasLevels && overlay && !this.actor.effects.some(effect =>
            effect.statuses.has(statusId) && effect.system?.level > 0
        )) return;
        const options = hasLevels ? { levels: overlay ? -1 : 1 } : { overlay };
        await this.actor.toggleStatusEffect(statusId, options);
        this.render();
    }
    _onContextMenu(event) {
        event.preventDefault();
        event.stopPropagation();
        return this._onToggleEffect(event, {overlay: true});
    }    
    async close(options = {}) {
        if (options?.closeKey) {
            console.log("[Crux] ESC-initiated close ignored.");
            return false;
        }
        CruxAnchoredFlyout.unregisterCloseOnBlur(this);
        this.anchorTarget?.blur?.();
        return super.close(options);
    }
    setPosition(options = {}) {
        return super.setPosition(CruxAnchoredFlyout.getPosition(this, this.anchorEvent, options));
    }

    _onRender(context, options) {
        super._onRender(context, options);
        CruxAnchoredFlyout.applyTheme(this.element);
        this.setPosition();
        this.anchorTarget?.blur?.();
        CruxAnchoredFlyout.registerCloseOnBlur(this, this.element, this.anchorTarget);
        this.element.querySelectorAll('.effect-control').forEach(el => {
            el.addEventListener('click', this._onToggleEffect.bind(this));
            el.addEventListener('contextmenu', this._onContextMenu.bind(this));
        });
    }
}
