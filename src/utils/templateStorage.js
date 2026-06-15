import { BUILTIN_TEMPLATES } from './builtinTemplates';

const STORAGE_KEY = 'raffle_templates';
const MAX_USER_TEMPLATES = 20;

export function listUserTemplates() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function listTemplates() {
  return [...BUILTIN_TEMPLATES, ...listUserTemplates()];
}

export function saveTemplate(name, rules) {
  const templates = listUserTemplates();
  if (templates.length >= MAX_USER_TEMPLATES) {
    templates.shift(); // remove oldest
  }
  templates.push({
    id: `user_${Date.now()}`,
    name: name.trim(),
    createdAt: new Date().toISOString(),
    rules,
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  return templates;
}

export function deleteTemplate(id) {
  const templates = listUserTemplates().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  return templates;
}

// setters: object with setter functions from useRaffleForm (setEntryMethod, setRequireMentionRule, etc.)
export function applyTemplate(template, setters) {
  const r = template.rules || {};
  if (r.entryMethod != null) setters.setEntryMethod(r.entryMethod);
  if (r.requireComment != null) setters.setRequireComment(r.requireComment);
  if (r.requireLike != null) setters.setRequireLike(r.requireLike);
  if (r.requireSave != null) setters.setRequireSave(r.requireSave);
  if (r.requireFollowAccounts != null) setters.setRequireFollowAccounts(r.requireFollowAccounts);
  if (r.requireMentionRule != null) setters.setRequireMentionRule(r.requireMentionRule);
  if (r.minMentions != null) setters.setMinMentions(r.minMentions);
  if (r.maxMentions != null) setters.setMaxMentions(r.maxMentions);
  if (r.mentionMode != null) setters.setMentionMode(r.mentionMode);
  if (r.weightedEntry != null) setters.setWeightedEntry(r.weightedEntry);
  if (r.uniqueMentions != null) setters.setUniqueMentions(r.uniqueMentions);
  if (r.keywordRequired != null) setters.setKeywordRequired(r.keywordRequired);
  if (r.maxCommentsPerUser != null) setters.setMaxCommentsPerUser(r.maxCommentsPerUser);
}
