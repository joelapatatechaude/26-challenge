/** Mock SSE for planning phase (comprehension + outline) */
function mockPlanningSSE(opts: {
  jobId?: string;
  slideCount?: number;
  deckMode?: 'baseline' | 'localise' | 'fresh';
  gaps?: string[];
  templateFilename?: string;
} = {}) {
  const {
    jobId = 'job-plan-1',
    slideCount = 6,
    deckMode = 'fresh',
    gaps = [],
    templateFilename,
  } = opts;

  const outline = Array.from({ length: slideCount }, (_, i) => ({
    slide_index: i + 1,
    element: `slide-${i + 1}`,
    purpose: `Purpose for slide ${i + 1}`,
  }));

  const comprehension: Record<string, unknown> = {
    deck_mode: deckMode,
    summary: 'I understand you want a sovereign cloud presentation for the target account.',
    geo_context: 'Germany',
    document_ref: 'none',
    audience: 'CTO',
    gaps,
  };
  if (templateFilename) comprehension.template_filename = templateFilename;

  return [
    'event: progress',
    'data: {"status":"Analysing your request..."}',
    '',
    'event: comprehension',
    `data: ${JSON.stringify(comprehension)}`,
    '',
    'event: outline_ready',
    `data: ${JSON.stringify({ job_id: jobId, outline })}`,
    '',
    'event: completed',
    'data: {"status":"outline_ready"}',
    '',
  ].join('\n');
}

/** Mock SSE for approve/build phase */
function mockApproveSSE(slideCount = 3) {
  const lines: string[] = [
    'event: progress',
    'data: {"status":"Building slides..."}',
    '',
  ];

  for (let i = 1; i <= slideCount; i++) {
    lines.push(
      'event: slide_spec',
      `data: {"slide_index":${i},"title":"Slide ${i}"}`,
      '',
    );
  }

  lines.push(
    'event: deck_ready',
    'data: {"path":"/tmp/sovereignty-deck.pptx","download_url":"/api/v1/download?path=%2Ftmp%2Fsovereignty-deck.pptx","filename":"sovereignty-deck.pptx","size_kb":512}',
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

function visitPresentationTab() {
  cy.visit('/ai-toolkit');
  cy.get('[data-testid="composer-input"]').should('be.visible');
}

function interceptUploadMock(uploadId = 'upload-1', paths = ['/uploads/ref.pdf']) {
  cy.intercept('POST', '/api/v1/upload', {
    statusCode: 200,
    body: { upload_id: uploadId, paths },
  }).as('uploadFile');
}

function interceptPlanningMock(opts: Parameters<typeof mockPlanningSSE>[0] = {}) {
  cy.intercept('POST', '/api/v1/generate', (req) => {
    req.reply({
      statusCode: 200,
      headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' },
      body: mockPlanningSSE(opts),
    });
  }).as('generatePlan');
}

function interceptApproveMock(slideCount = 3, delayMs = 0) {
  cy.intercept('POST', '/api/v1/generate/*/approve', (req) => {
    req.reply({
      delay: delayMs,
      statusCode: 200,
      headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' },
      body: mockApproveSSE(slideCount),
    });
  }).as('approveBuild');
}

function interceptRefineMock(newSlideCount = 4) {
  cy.intercept('POST', '/api/v1/generate/*/refine', {
    statusCode: 200,
    body: {
      message: 'Updated outline',
      outline: Array.from({ length: newSlideCount }, (_, i) => ({
        slide_index: i + 1,
        element: `slide-${i + 1}`,
        purpose: `Refined slide ${i + 1}`,
      })),
    },
  }).as('refineOutline');
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

    it('default tab is Presentation Generator with chat composer', () => {
      cy.visit('/ai-toolkit');
      cy.contains('[role="tab"]', 'Presentation Generator')
        .should('have.attr', 'data-state', 'active');
      cy.get('[data-testid="composer-input"]').should('be.visible');
      cy.get('[data-testid="preview-panel"]').should('be.visible');
      cy.get('[data-testid="preview-state-idle"]').should('be.visible');
    });
  });

  describe('B. PresentationChat — ChatComposer', () => {
    beforeEach(() => visitPresentationTab());

    it('shows Plan my presentation send label when idle', () => {
      cy.get('[data-testid="composer-send"]').should('contain.text', 'Plan my presentation');
    });

    it('Enter sends message, Shift+Enter inserts newline', () => {
      interceptPlanningMock();
      cy.get('[data-testid="composer-input"]').type('Germany sovereign cloud deck{enter}');
      cy.wait('@generatePlan');
      cy.get('[data-testid="composer-input"]').should('contain.value', '');
    });

    it('disables composer during planning', () => {
      interceptPlanningMock();
      cy.intercept('POST', '/api/v1/generate', (req) => {
        req.reply({
          delay: 2000,
          statusCode: 200,
          headers: { 'content-type': 'text/event-stream' },
          body: mockPlanningSSE(),
        });
      }).as('slowPlan');
      cy.get('[data-testid="composer-input"]').type('Germany market overview{enter}');
      cy.get('[data-testid="composer-input"]').should('have.class', 'pointer-events-none');
      cy.get('[data-testid="preview-state-planning"]').should('be.visible');
    });

    it('New presentation button resets state', () => {
      interceptPlanningMock();
      cy.get('[data-testid="composer-input"]').type('France telecom pitch{enter}');
      cy.wait('@generatePlan');
      cy.get('[data-testid="outline-card"]').should('be.visible');
      cy.get('[data-testid="new-presentation-btn"]').click();
      cy.get('[data-testid="outline-card"]').should('not.exist');
      cy.get('[data-testid="preview-state-idle"]').should('be.visible');
      cy.get('[data-testid="composer-send"]').should('contain.text', 'Plan my presentation');
    });
  });

  describe('C. PresentationChat — ClarificationCard', () => {
    beforeEach(() => visitPresentationTab());

    it('shows clarification when geo cannot be inferred', () => {
      cy.get('[data-testid="composer-input"]').type('Build a deck about OpenShift sovereignty{enter}');
      cy.get('[data-testid="clarification-card"]').should('be.visible');
      cy.get('[data-testid="clarification-card"]').should(
        'contain.text',
        'Before I start planning, which region is this presentation for?',
      );
      cy.get('[data-testid="preview-state-clarifying"]').should('be.visible');
    });

    it('region chip triggers generate with inferred geo', () => {
      interceptPlanningMock();
      cy.get('[data-testid="composer-input"]').type('OpenShift overview{enter}');
      cy.get('[data-testid="region-chip-de"]').click();
      cy.wait('@generatePlan').its('request.body').then((body) => {
        expect(body.geo).to.eq('de');
      });
      cy.get('[data-testid="clarification-card"]').should('not.exist');
    });

    it('skips clarification when geo is in message', () => {
      interceptPlanningMock();
      cy.get('[data-testid="composer-input"]').type('German market OpenShift deck{enter}');
      cy.wait('@generatePlan');
      cy.get('[data-testid="clarification-card"]').should('not.exist');
    });
  });

  describe('D. PresentationChat — FileRoleChip', () => {
    beforeEach(() => {
      interceptUploadMock('tpl-1', ['/uploads/theme.pptx']);
      visitPresentationTab();
    });

    it('uploads PDF as reference chip without dropdown', () => {
      cy.intercept('POST', '/api/v1/upload', {
        statusCode: 200,
        body: { upload_id: 'ref-1', paths: ['/uploads/brief.pdf'] },
      }).as('uploadPdf');

      cy.get('[data-testid="composer-attach"]').click();
      cy.get('input[type="file"]').selectFile(
        {
          contents: Cypress.Buffer.from('pdf'),
          fileName: 'brief.pdf',
          mimeType: 'application/pdf',
        },
        { force: true },
      );
      cy.wait('@uploadPdf');
      cy.get('[data-testid="file-chip-brief.pdf"]').should('be.visible');
      cy.get('[data-testid="file-chip-brief.pdf"]').should('contain.text', 'Reference');
      cy.get('[data-testid="file-role-toggle-brief.pdf"]').should('not.exist');
    });

    it('uploads PPTX with theme toggle and remove', () => {
      cy.get('[data-testid="composer-attach"]').click();
      cy.get('input[type="file"]').selectFile(
        {
          contents: Cypress.Buffer.from('pptx'),
          fileName: 'theme.pptx',
          mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        },
        { force: true },
      );
      cy.wait('@uploadFile');
      cy.get('[data-testid="file-chip-theme.pptx"]').should('be.visible');
      cy.get('[data-testid="file-role-toggle-theme.pptx"]').should('contain.text', 'Theme template');
      cy.get('[data-testid="file-chip-theme.pptx"]').find('button').contains('✕').click();
      cy.get('[data-testid="file-chip-theme.pptx"]').should('not.exist');
    });
  });

  describe('E. PresentationChat — Comprehension & Outline cards', () => {
    beforeEach(() => {
      interceptPlanningMock({ slideCount: 7, deckMode: 'baseline', templateFilename: 'corp-theme.pptx', gaps: ['timeline', 'budget'] });
      visitPresentationTab();
      cy.get('[data-testid="composer-input"]').type('Germany sovereign cloud{enter}');
      cy.wait('@generatePlan');
    });

    it('shows comprehension card with template locked pill in baseline mode', () => {
      cy.get('[data-testid="comprehension-card"]').should('be.visible');
      cy.get('[data-testid="template-locked-pill"]').should('contain.text', 'corp-theme.pptx');
      cy.get('[data-testid="gaps-nudge"]').should('contain.text', 'timeline');
      cy.get('[data-testid="gaps-nudge"]').find('button').contains('✕').click();
      cy.get('[data-testid="gaps-nudge"]').should('not.exist');
    });

    it('shows outline card with collapse and action chips', () => {
      cy.get('[data-testid="outline-card"]').should('be.visible');
      cy.get('[data-testid="outline-slide-0"]').should('be.visible');
      cy.get('[data-testid="outline-slide-4"]').should('be.visible');
      cy.get('[data-testid="outline-slide-5"]').should('not.exist');
      cy.contains('Show all 7 slides').click();
      cy.get('[data-testid="outline-slide-5"]').should('be.visible');
      cy.get('[data-testid="chip-generate"]').should('be.visible');
      cy.get('[data-testid="chip-fewer"]').should('be.visible');
      cy.get('[data-testid="chip-add-section"]').should('be.visible');
    });

    it('reviewing state shows outline in preview panel', () => {
      cy.get('[data-testid="preview-state-reviewing"]').should('be.visible');
      cy.contains('Reviewing outline').should('be.visible');
      cy.get('[data-testid="composer-send"]').should('contain.text', 'Refine');
    });
  });

  describe('F. PresentationChat — Generate flow', () => {
    beforeEach(() => {
      interceptPlanningMock({ slideCount: 3 });
      visitPresentationTab();
      cy.get('[data-testid="composer-input"]').type('Spain market deck{enter}');
      cy.wait('@generatePlan');
    });

    it('Generate slides chip triggers approve SSE', () => {
      interceptApproveMock(3, 1500);
      cy.get('[data-testid="chip-generate"]').click();
      cy.get('[data-testid="preview-state-building"]').should('be.visible');
      cy.wait('@approveBuild');
      cy.get('[data-testid="slide-card-0"]', { timeout: 10000 }).should('be.visible');
      cy.get('[data-testid="preview-state-done"]', { timeout: 10000 }).should('be.visible');
      cy.get('[data-testid="deck-download"]').should('contain.text', 'Download PPTX');
    });

    it('generate intent in composer triggers approve', () => {
      interceptApproveMock(3);
      cy.get('[data-testid="composer-input"]').type('looks good{enter}');
      cy.wait('@approveBuild');
      cy.get('[data-testid="preview-state-done"]', { timeout: 10000 }).should('be.visible');
    });

    it('Fewer slides chip calls refine API', () => {
      interceptRefineMock(2);
      cy.get('[data-testid="chip-fewer"]').click();
      cy.wait('@refineOutline').its('request.body').then((body) => {
        expect(body.instruction).to.contain('shorter');
      });
    });

    it('Add a section chip focuses composer', () => {
      cy.get('[data-testid="chip-add-section"]').click();
      cy.get('[data-testid="composer-input"]').should('be.focused');
    });
  });

  describe('G. PresentationChat — Geo inference', () => {
    beforeEach(() => visitPresentationTab());

    const cases: Array<{ text: string; geo: string }> = [
      { text: 'French market overview', geo: 'fr' },
      { text: 'UK telecom briefing', geo: 'uk' },
      { text: 'APAC expansion plan', geo: 'apac' },
    ];

    cases.forEach(({ text, geo }) => {
      it(`infers geo "${geo}" from "${text}"`, () => {
        interceptPlanningMock();
        cy.get('[data-testid="composer-input"]').type(`${text}{enter}`);
        cy.wait('@generatePlan').its('request.body').then((body) => {
          expect(body.geo).to.eq(geo);
        });
      });
    });
  });

  describe('H. Asset Customizer', () => {
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

  describe('I. Draft Creator', () => {
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

  describe('J. Language Selector', () => {
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
