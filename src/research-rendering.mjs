import { escapeHtml } from './format.mjs';
import { references, researchTopics } from './research-references.mjs';

function yearSuffix(reference, separator = ' · ') {
  return reference.year ? `${separator}${reference.year}` : '';
}

function publicationMetadata(reference) {
  const doi = reference.doi ? ` · DOI: ${reference.doi}` : '';
  return `${reference.publisher}${doi}`;
}

function citationAccessibleLabel(reference) {
  const year = reference.year ? `，${reference.year}` : '';
  const doi = reference.doi ? `。DOI ${reference.doi}` : '';
  return `${reference.authors}${year}。${reference.title}。${reference.publisher}${doi}。在新窗口打开。`;
}

function renderDesktopCitation(reference) {
  return `
    <div class="reference-desktop">
      <div class="reference-byline">
        ${escapeHtml(reference.authors)}${yearSuffix(reference)}
        <span>${escapeHtml(reference.type)}</span>
      </div>
      <a
        class="research-citation"
        data-link-purpose="research"
        href="${escapeHtml(reference.url)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        ${escapeHtml(reference.title)}
        <span aria-hidden="true">↗</span>
        <span class="sr-only">（新窗口）</span>
      </a>
      <div class="reference-publication">${escapeHtml(publicationMetadata(reference))}</div>
      <p class="reference-summary">${escapeHtml(reference.summary)}</p>
      <p class="reference-limit">${escapeHtml(reference.limitations)}</p>
    </div>
  `;
}

/**
 * Mobile and desktop use the same source record but different reading density.
 * Both branches are real links; CSS hides the inactive one from keyboard and
 * assistive-technology navigation.
 */
function renderMobileCitation(reference) {
  const year = reference.year ? `，${reference.year}` : '';
  return `
    <a
      class="research-citation reference-mobile-link"
      data-link-purpose="research"
      href="${escapeHtml(reference.url)}"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="${escapeHtml(citationAccessibleLabel(reference))}"
    >
      <span class="reference-mobile-copy">
        <span class="reference-mobile-byline">
          ${escapeHtml(`${reference.mobile.authors}${year}`)}
        </span>
        <span class="reference-mobile-topic">
          ${escapeHtml(reference.mobile.title)}
          <span aria-hidden="true">·</span>
          ${escapeHtml(reference.mobile.publisher)}
        </span>
        <span class="reference-mobile-icon" aria-hidden="true">↗</span>
      </span>
    </a>
  `;
}

function renderDetailedReference(reference) {
  return `
    <li class="reference-detail-item" data-reference-detail="${escapeHtml(reference.id)}">
      <div class="reference-detail-heading">
        ${escapeHtml(reference.authors)}${yearSuffix(reference)}
      </div>
      <div class="reference-detail-title">${escapeHtml(reference.title)}</div>
      <div class="reference-publication">${escapeHtml(publicationMetadata(reference))}</div>
      <p><strong>研究发现</strong>${escapeHtml(reference.summary)}</p>
      <p class="reference-limit"><strong>研究局限</strong>${escapeHtml(reference.limitations)}</p>
    </li>
  `;
}

function renderTopicCitations(topic) {
  return topic.refs
    .map((referenceId) => {
      const reference = references[referenceId];
      return `
        <li data-reference-id="${escapeHtml(reference.id)}">
          ${renderDesktopCitation(reference)}
          ${renderMobileCitation(reference)}
        </li>
      `;
    })
    .join('');
}

function renderDetailedReading(topic) {
  return `
    <details class="research-details">
      <summary>深入研究依据 <span>· ${topic.refs.length} 篇</span></summary>
      <p class="research-details-intro">查看完整题名、研究发现、DOI 与研究局限。</p>
      <ol class="reference-detail-list">
        ${topic.refs.map((referenceId) => renderDetailedReference(references[referenceId])).join('')}
      </ol>
    </details>
  `;
}

export function renderResearchSection(topicId, { showContext = true } = {}) {
  const topic = researchTopics[topicId];
  if (!topic) {
    throw new Error(`Unknown research topic: ${topicId}`);
  }

  const context = showContext
    ? `<p>${escapeHtml(topic.context)}</p>`
    : '';

  return `
    <div class="research-context" data-research-topic="${escapeHtml(topic.id)}">
      ${context}
      <details class="research-disclosure">
        <summary>研究依据与参考资料 <span>· ${topic.refs.length} 篇</span></summary>
        <p class="research-method">
          <strong>本页如何阅读</strong>
          ${escapeHtml(topic.method)}
        </p>
        <ol class="reference-list">
          ${renderTopicCitations(topic)}
        </ol>
        ${renderDetailedReading(topic)}
      </details>
    </div>
  `;
}
