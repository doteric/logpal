const menu = document.querySelector('.menu');
const links = document.querySelector('.links');
const copyButton = document.querySelector('[data-copy]');
const formatTabs = document.querySelectorAll('.format-tab');
const formatName = document.querySelector('#format-name');
const formatDescription = document.querySelector('#format-description');
const formatSchema = document.querySelector('#format-schema');
const formatExample = document.querySelector('#format-example');

const formats = {
  lambda: {
    name: 'AWS Lambda',
    description:
      'Capture AWS invocation details and attach your own contextual data.',
    schema: `const lambdaFormat = z
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
  "warnings": [{ "type": "retry", "attempt": 2 }],
  "upstreamResponses": [
    { "service": "inventory", "statusCode": 200 }
  ]
}`,
  },
  httpRequest: {
    name: 'HTTP request',
    description:
      'Record the complete request and response pair, including duration.',
    schema: `const httpRequestFormat = z
  .object({
    request: z.object({
      path: z.string(),
      method: z.string(),
      headers: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
      query: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
    }),
    response: z.object({
      statusCode: z.number(),
      durationMs: z.number(),
      headers: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
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
  "eventType": "checkout",
  "requestId": "req_7z2k",
  "errors": [{ "type": "payment-declined", "retryable": false }],
  "warnings": [],
  "upstreamResponses": [
    { "service": "payments", "statusCode": 402, "durationMs": 61 }
  ]
}`,
  },
};

const selectFormat = (format) => {
  const selected = formats[format];
  formatName.textContent = selected.name;
  formatDescription.textContent = selected.description;
  formatSchema.textContent = selected.schema;
  formatExample.textContent = selected.example;

  formatTabs.forEach((tab) => {
    const active = tab.dataset.format === format;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
};

menu.addEventListener('click', () => {
  const open = links.classList.toggle('open');
  menu.setAttribute('aria-expanded', String(open));
});

links.addEventListener('click', () => {
  links.classList.remove('open');
  menu.setAttribute('aria-expanded', 'false');
});

copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(copyButton.dataset.copy);
    copyButton.textContent = 'Copied!';
  } catch {
    copyButton.textContent = 'Copy command';
  }
  window.setTimeout(() => {
    copyButton.textContent = 'Copy';
  }, 1800);
});

formatTabs.forEach((tab) => {
  tab.addEventListener('click', () => selectFormat(tab.dataset.format));
});

document.querySelector('#year').textContent = new Date().getFullYear();
selectFormat('lambda');
