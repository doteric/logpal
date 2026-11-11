const menu = document.querySelector('.menu');
const links = document.querySelector('.links');
const copyButtons = document.querySelectorAll('[data-copy]');
const copyStatus = document.querySelector('#copy-status');
const formatTabs = document.querySelectorAll('.format-tab');
const formatName = document.querySelector('#format-name');
const formatDescription = document.querySelector('#format-description');
const formatSchema = document.querySelector('#format-schema');
const formatExample = document.querySelector('#format-example');
const formatDetails = document.querySelector('#format-details');

const formats = {
  lambda: {
    name: 'AWS Lambda',
    description: 'AWS invocation fields, supplied through addData().',
    schema: `import { z } from 'zod';

const lambdaFormat = z
  .object({
    functionName: z.string().optional(),
    functionVersion: z.string().optional(),
    awsRequestId: z.string().optional(),
    custom: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();`,
    example: `{
  "functionName": "process-order",
  "functionVersion": "$LATEST",
  "awsRequestId": "bd6ec3d8-1d7b-4b79",
  "custom": {
    "orderId": "ord_2048",
    "region": "eu-central-1"
  },
  "eventType": "order-fulfillment",
  "requestId": "req_7z2k",
  "errors": [],
  "warnings": [],
  "externalCalls": []
}`,
  },
  httpRequest: {
    name: 'HTTP request',
    description:
      'Request and response fields. Supply status and duration yourself.',
    schema: `import { z } from 'zod';

const httpRequestFormat = z
  .object({
    request: z.object({
      path: z.string(),
      method: z.string(),
      headers: z.record(
        z.string(),
        z.union([z.string(), z.array(z.string())])
      ).optional(),
      query: z.record(
        z.string(),
        z.union([z.string(), z.array(z.string())])
      ).optional(),
    }),
    response: z.object({
      statusCode: z.number(),
      durationMs: z.number(),
      headers: z.record(
        z.string(),
        z.union([z.string(), z.array(z.string())])
      ).optional(),
    }),
    custom: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();`,
    example: `{
  "request": {
    "path": "/orders/2048",
    "method": "POST",
    "query": { "preview": "false" }
  },
  "response": {
    "statusCode": 201,
    "durationMs": 84
  },
  "custom": { "orderId": "ord_2048" },
  "eventType": "req-summary-log",
  "requestId": "req_7z2k",
  "errors": [],
  "warnings": [],
  "externalCalls": []
}`,
  },
};

const selectFormat = (format) => {
  const selected = formats[format];
  formatName.textContent = selected.name;
  formatDescription.textContent = selected.description;
  formatSchema.textContent = selected.schema;
  formatExample.textContent = selected.example;
  formatSchema.parentElement.scrollTo(0, 0);
  formatExample.parentElement.scrollTo(0, 0);

  formatTabs.forEach((tab) => {
    const active = tab.dataset.format === format;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    if (active) formatDetails.setAttribute('aria-labelledby', tab.id);
  });
};

menu.addEventListener('click', () => {
  const open = links.classList.toggle('open');
  menu.setAttribute('aria-expanded', String(open));
});

const closeMenu = () => {
  links.classList.remove('open');
  menu.setAttribute('aria-expanded', 'false');
};

links.addEventListener('click', (event) => {
  if (event.target.closest('a')) closeMenu();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && links.classList.contains('open')) {
    closeMenu();
    menu.focus();
  }
});

copyButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    const label = button.querySelector('.copy-label');
    button.disabled = true;
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      label.textContent = 'Copied!';
      copyStatus.textContent = 'Install command copied to clipboard.';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(button.parentElement.querySelector('code'));
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      label.textContent = 'Selected';
      copyStatus.textContent =
        'Install command selected. Use your keyboard to copy it.';
    }
    window.setTimeout(() => {
      label.textContent = 'Copy';
      button.disabled = false;
      copyStatus.textContent = '';
    }, 1800);
  });
});

formatTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectFormat(tab.dataset.format));
  tab.addEventListener('keydown', (event) => {
    let nextIndex;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % formatTabs.length;
    if (event.key === 'ArrowLeft')
      nextIndex = (index - 1 + formatTabs.length) % formatTabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = formatTabs.length - 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    const nextTab = formatTabs[nextIndex];
    selectFormat(nextTab.dataset.format);
    nextTab.focus();
  });
});

document.querySelector('#year').textContent = new Date().getFullYear();
selectFormat('lambda');

const logDemo = document.querySelector('[data-log-demo]');

if (logDemo && typeof logDemo.animate === 'function') {
  const toggle = logDemo.querySelector('.demo-toggle');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 16000;
  let paused = reducedMotion.matches;

  const animations = Array.from(
    logDemo.querySelectorAll('[data-log-arrival]'),
    (element) => {
      const arrival = Number(element.dataset.logArrival);
      const animation = element.animate(
        [
          { opacity: 0, transform: 'translateY(4px)', offset: 0 },
          { opacity: 0, transform: 'translateY(4px)', offset: arrival },
          { opacity: 1, transform: 'translateY(0)', offset: arrival + 0.025 },
          { opacity: 1, transform: 'translateY(0)', offset: 0.88 },
          { opacity: 0, transform: 'translateY(0)', offset: 0.95 },
          { opacity: 0, transform: 'translateY(0)', offset: 1 },
        ],
        { duration, iterations: Infinity },
      );
      animation.pause();
      animation.currentTime = 0;
      return animation;
    },
  );

  const updatePlayback = () => {
    logDemo.classList.toggle('show-all', paused);
    animations.forEach((animation) => {
      if (paused) animation.cancel();
      else if (document.hidden) animation.pause();
      else animation.play();
    });
    toggle.textContent = paused ? 'Play' : 'Pause';
    toggle.setAttribute(
      'aria-label',
      paused
        ? 'Play log animation from the start'
        : 'Pause animation and show all logs',
    );
  };

  const showCompleted = () => {
    paused = true;
    updatePlayback();
  };

  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    if (!paused) {
      showCompleted();
      return;
    }
    paused = false;
    animations.forEach((animation) => {
      animation.currentTime = 0;
    });
    updatePlayback();
  });
  logDemo.addEventListener('focusin', (event) => {
    if (!event.target.closest('pre')) return;
    showCompleted();
  });
  reducedMotion.addEventListener('change', (event) => {
    if (!event.matches) return;
    showCompleted();
  });
  document.addEventListener('visibilitychange', updatePlayback);
  updatePlayback();
}
