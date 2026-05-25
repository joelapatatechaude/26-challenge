/** Mock SSE response for POST /api/v1/generate */
function mockGenerateSSE(slideCount = 3) {
  const lines: string[] = [
    'event: progress',
    'data: {"status":"Starting deck generation..."}',
    '',
  ];

  for (let i = 0; i < slideCount; i++) {
    lines.push(
      'event: slide_spec',
      `data: {"slide_index":${i},"title":"Slide ${i + 1}"}`,
      '',
    );
  }

  lines.push(
    'event: deck_ready',
    'data: {"path":"/tmp/sovereignty-deck.pptx","slides":' + slideCount + ',"size_kb":512}',
    '',
    'event: completed',
    'data: {"status":"completed"}',
    '',
  );

  return lines.join('\n');
}

function loginAndEnterDashboard() {
  cy.visit('/login');
  cy.contains('button', 'SINGLE SIGN-ON').click();
  cy.contains('Enter Dashboard', { timeout: 10000 }).should('be.visible').click();
  cy.url().should('include', '/home');
}

function goToAIToolkit() {
  cy.contains('a', 'AI Toolkit').click();
  cy.url().should('include', '/ai-toolkit');
  cy.contains('h1', 'AI Content Toolkit').should('be.visible');
}

function interceptGenerateMock(slideCount = 3, delayMs = 0) {
  cy.intercept('POST', '/api/v1/generate', (req) => {
    req.reply({
      delay: delayMs,
      statusCode: 200,
      headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' },
      body: mockGenerateSSE(slideCount),
    });
  }).as('generateDeck');
}

describe('AI Toolkit', () => {
  describe('A. Navigation & Layout', () => {
    it('login and navigate to AI Toolkit', () => {
      loginAndEnterDashboard();
      goToAIToolkit();
    });

    it('verify three tabs exist', () => {
      cy.visit('/ai-toolkit');
      cy.contains('[role="tab"]', 'Presentation Generator').should('exist');
      cy.contains('[role="tab"]', 'Asset Customizer').should('exist');
      cy.contains('[role="tab"]', 'Draft Creator').should('exist');
    });

    it('default tab is Presentation Generator', () => {
      cy.visit('/ai-toolkit');
      cy.contains('[role="tab"]', 'Presentation Generator')
        .should('have.attr', 'data-state', 'active');
      cy.contains('label', 'Prompt Context').should('be.visible');
    });
  });

  describe('B. Presentation Generator', () => {
    beforeEach(() => {
      interceptGenerateMock();
      cy.visit('/ai-toolkit');
    });

    it('form elements render', () => {
      cy.contains('label', 'Prompt Context').should('be.visible');
      cy.contains('label', 'Region Target').should('be.visible');
      cy.contains('label', 'Industry').should('be.visible');
      cy.contains('label', 'Slide Count').should('be.visible');
      cy.contains('label', 'Audience').should('be.visible');
      cy.contains('button', 'Generate Presentation').should('be.visible');
    });

    it('Generate button triggers loading state', () => {
      interceptGenerateMock(3, 2000);
      cy.contains('button', 'Generate Presentation').click();
      cy.contains('Generating...').should('be.visible');
      cy.get('.animate-spin').should('exist');
    });

    it('SSE progress messages display', () => {
      cy.contains('button', 'Generate Presentation').click();
      cy.wait('@generateDeck');
      cy.get('[data-testid="sse-progress"]', { timeout: 10000 })
        .should('be.visible')
        .and('contain.text', 'Starting deck generation');
      cy.contains('Slide 3/10 generated').should('be.visible');
    });

    it('deck ready shows download', () => {
      cy.contains('button', 'Generate Presentation').click();
      cy.wait('@generateDeck');
      cy.get('[data-testid="deck-download"]', { timeout: 10000 })
        .should('be.visible')
        .and('contain.text', 'Download Deck');
    });

    it('preview card renders after generation', () => {
      cy.contains('button', 'Generate Presentation').click();
      cy.wait('@generateDeck');
      cy.contains('h3', 'Preview', { timeout: 10000 }).should('be.visible');
      cy.contains('.font-black', 'RH').should('be.visible');
      cy.contains('Deutsche Telekom').should('be.visible');
      cy.contains('Digital Sovereignty with OpenShift').should('be.visible');
      cy.contains('EMEA Sales Enablement').should('be.visible');
    });

    it('language selector changes output', () => {
      cy.contains('Output:').parent().find('button').first().click({ force: true });
      cy.contains('[role="option"]', 'Deutsch').click({ force: true });
      cy.contains('button', 'Generate Presentation').click();
      cy.wait('@generateDeck');
      cy.contains('Digitale Souveränität mit OpenShift', { timeout: 10000 }).should('be.visible');
      cy.contains('EMEA Vertriebsbefähigung').should('be.visible');
    });
  });

  describe('C. Asset Customizer', () => {
    beforeEach(() => {
      cy.visit('/ai-toolkit');
      cy.contains('[role="tab"]', 'Asset Customizer').click();
    });

    it('asset selector renders with 6 options', () => {
      cy.contains('label', 'Base Asset').should('be.visible');
      cy.contains('label', 'Base Asset').parent().find('button').click({ force: true });
      cy.get('[role="option"]').should('have.length', 6);
    });

    it('customization options render — 5 checkboxes', () => {
      cy.contains('Customization Options').should('be.visible');
      cy.get('input[type="checkbox"]').should('have.length', 5);
    });

    it('Customize button triggers loading', () => {
      cy.contains('button', 'Customize for Account').click();
      cy.contains('Customizing Asset...').should('be.visible');
      cy.get('.animate-spin').should('exist');
    });
  });

  describe('D. Draft Creator', () => {
    beforeEach(() => {
      cy.visit('/ai-toolkit');
      cy.contains('[role="tab"]', 'Draft Creator').click();
    });

    it('draft type cards render', () => {
      cy.contains('button', 'Outreach Email').should('be.visible');
      cy.contains('button', 'Executive Summary').should('be.visible');
      cy.contains('button', 'Thought Leadership').should('be.visible');
      cy.contains('button', 'Social Post').should('be.visible');
    });

    it('generate draft shows output', () => {
      cy.contains('button', 'Generate Draft').click();
      cy.contains('Writing Draft...').should('be.visible');
      cy.contains('Draft Ready', { timeout: 5000 }).should('be.visible');
    });

    it('draft type selection changes output', () => {
      cy.contains('button', 'Generate Draft').click();
      cy.contains('Draft Ready', { timeout: 5000 }).should('be.visible');
      cy.contains('Subject: Ensuring Deutsche Telekom').should('be.visible');

      cy.contains('button', 'Executive Summary').click();
      cy.contains('button', 'Generate Draft').click();
      cy.contains('Draft Ready', { timeout: 5000 }).should('be.visible');
      cy.contains('Red Hat Digital Sovereignty: Executive Summary').should('be.visible');
      cy.contains('Subject: Ensuring Deutsche Telekom').should('not.exist');
    });
  });

  describe('E. Language Selector', () => {
    beforeEach(() => {
      cy.visit('/ai-toolkit');
    });

    it('language picker has all 8 languages', () => {
      cy.contains('Output:').parent().find('button').first().click({ force: true });
      const langs = ['English', 'Deutsch', 'Français', 'Español', 'Italiano', 'Nederlands', '日本語', 'Português'];
      langs.forEach(lang => cy.contains('[role="option"]', lang).should('exist'));
    });

    it('selecting non-English shows localization badge', () => {
      cy.contains('Output:').parent().find('button').first().click({ force: true });
      cy.contains('[role="option"]', 'Deutsch').click({ force: true });
      cy.contains('Localized:').should('be.visible');
      cy.contains('DSGVO / BSI C5').should('be.visible');
    });
  });
});
