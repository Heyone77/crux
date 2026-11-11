import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import * as Settings from '../scripts/settings/CruxSettingDefinitions.js';

const english = JSON.parse(readFileSync(new URL('../lang/en.json', import.meta.url), 'utf8'));
const russian = JSON.parse(readFileSync(new URL('../lang/ru.json', import.meta.url), 'utf8'));
const polish = JSON.parse(readFileSync(new URL('../lang/pl.json', import.meta.url), 'utf8'));
const manifest = JSON.parse(readFileSync(new URL('../module.json', import.meta.url), 'utf8'));

function leaves(object, prefix = '') {
    return Object.entries(object).flatMap(([key, value]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        return typeof value === 'string' ? [[path, value]] : leaves(value, path);
    });
}

test('Russian dictionary covers all existing English keys and format placeholders', () => {
    const ru = new Map(leaves(russian));
    for (const [key, value] of leaves(english)) {
        assert.ok(ru.has(key), `Missing Russian translation: ${key}`);
        assert.deepEqual([...value.matchAll(/\{[^}]+\}/g)].map(m => m[0]).sort(),
            [...ru.get(key).matchAll(/\{[^}]+\}/g)].map(m => m[0]).sort(), key);
    }
    assert.ok(manifest.languages.some(language => language.lang === 'ru' && language.path === 'lang/ru.json'));
});

test('Polish dictionary covers all English keys and format placeholders', () => {
    const translated = new Map(leaves(polish));
    for (const [key, value] of leaves(english)) {
        assert.ok(translated.has(key), `Missing Polish translation: ${key}`);
        assert.deepEqual([...value.matchAll(/\{[^}]+\}/g)].map(m => m[0]).sort(),
            [...translated.get(key).matchAll(/\{[^}]+\}/g)].map(m => m[0]).sort(), key);
    }
    assert.ok(manifest.languages.some(language => language.lang === 'pl' && language.path === 'lang/pl.json'));
});

test('settings register translation keys before Foundry loads translations', () => {
    assert.equal(typeof Settings.localizeCruxSetting, 'function');
    const result = Settings.localizeCruxSetting('icon-size', { name:'Icon Size', hint:'Hint', choices:{small:'Small',large:'Large'} });
    assert.equal(result.name, 'crux.config.icon-size.name');
    assert.equal(result.hint, 'crux.config.icon-size.hint');
    assert.deepEqual(result.choices, {small:'crux.config.icon-size.choices.small',large:'crux.config.icon-size.choices.large'});
});

test('every visible Crux setting has a Russian name and description', () => {
    const ru = new Map(leaves(russian));
    for (const [key, setting] of Object.entries(Settings.createCruxSettingDefinitions({}))) {
        if (!setting.config) continue;
        for (const field of ['name', 'hint']) {
            if (!setting[field]) continue;
            const translatedKey = `crux.config.${key}.${field}`;
            assert.ok(ru.has(translatedKey) || ru.has(setting[field]), `Missing ${field} for ${key}`);
        }
    }
});

test('every visible Crux setting has a Polish name and description', () => {
    const translated = new Map(leaves(polish));
    for (const [key, setting] of Object.entries(Settings.createCruxSettingDefinitions({}))) {
        if (!setting.config) continue;
        for (const field of ['name', 'hint']) {
            if (!setting[field]) continue;
            const translatedKey = `crux.config.${key}.${field}`;
            assert.ok(translated.has(translatedKey) || translated.has(setting[field]), `Missing ${field} for ${key}`);
        }
    }
});
