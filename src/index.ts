import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ICommandPalette } from '@jupyterlab/apputils';
import { INotebookTracker } from '@jupyterlab/notebook';
import { addIcon, paletteIcon } from '@jupyterlab/ui-components';
import { CommandToolbarButton } from '@jupyterlab/apputils';

/**
 * Initialization data for the jupyterlab_docs_helper extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab_docs_helper:plugin',
  description: 'Extension for Suggestting Markdown for Jupyter code cells',
  autoStart: true,
  requires: [ICommandPalette, INotebookTracker],
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    tracker: INotebookTracker
  ) => {
    console.log('pallete', palette);
    console.log('trackerrrrrrrr', tracker);
    console.log('[docs-helper] extension activate() running');

    //add an application command
    const command: string = 'docs-helper:insert-note';
    app.commands.addCommand(command, {
      label: 'Docs Helper: Insert Markdown Note',
      icon: addIcon,
      execute: async () => {
        const panel = tracker.currentWidget;
        const nb = panel?.content;
        if (!panel || !nb || !nb.model) {
          return;
        }

        app.shell.activateById(panel.id); // target THIS notebook

        // If nothing is selected yet, pick an anchor so “above” is defined
        if (nb.activeCellIndex < 0 && nb.widgets.length > 0) {
          nb.activeCellIndex = 0;
        }

        // 1) Structural ops via built-in commands (UI-safe)
        await app.commands.execute('notebook:insert-cell-above');
        await app.commands.execute('notebook:change-cell-to-markdown');

        // 2) Fill the new cell’s text (modern API: shared model)
        const cell = nb.activeCell;
        if (cell) {
          const stub = '### What this cell does\n- \n\n### Why it matters\n- ';
          const sm: any = cell.model.sharedModel;
          if (typeof sm.setSource === 'function') {
            sm.setSource(stub);
          } else {
            sm.source = stub;
          }
        }

        // 3) Nice UX: cursor in the new cell
        await app.commands.execute('notebook:enter-edit-mode');
      }
    });
    palette.addItem({ command: command, category: 'Docs Helper' });

    const AI_MARKDOWN: string = 'docs-helper:ai-markdown';
    app.commands.addCommand(AI_MARKDOWN, {
      label: 'AI: Markdown',
      caption: 'Insert placeholder, run worker, replace with Markdown',
      icon: paletteIcon,
      execute: async () => {
        const panel = tracker.currentWidget;
        const nb = panel?.content;
        const active = nb?.activeCell;
        if (!panel || !nb || !active) {
          return;
        }

        // read source of the current (target) cell
        const sm: any = (active.model as any).sharedModel;
        const src =
          typeof sm.getSource === 'function'
            ? sm.getSource()
            : (sm.source ?? '');

        // Build the AI prompt text (for the worker cell)
        const prompt = `%%ai ollama:llama3.1
You are a helpful technical writer. Explain this Python code in concise Markdown:
- What it does
- Key steps
- Caveats
Write ONLY Markdown. ≤ 12 lines.

\`\`\`python
${src}
\`\`\`
`;

        app.shell.activateById(panel.id);

        // 1) Insert a Markdown placeholder ABOVE and keep it selected
        await app.commands.execute('notebook:insert-cell-above');
        await app.commands.execute('notebook:change-cell-to-markdown');

        const placeholderIndex = nb.activeCellIndex;
        const placeholderCell = nb.widgets[placeholderIndex];
        const phsm: any = (placeholderCell.model as any).sharedModel;
        const placeholderText =
          '### ⏳ Generating explanation…\n\nThis will be replaced automatically when ready.';
        if (typeof phsm.setSource === 'function') {
          phsm.setSource(placeholderText);
        } else {
          phsm.source = placeholderText;
        }
        console.log(
          '[docs-helper] placeholder inserted at index',
          placeholderIndex
        );

        // 2) Insert the actual AI worker cell **below** the placeholder
        nb.activeCellIndex = placeholderIndex; // ensure we are on the placeholder
        await app.commands.execute('notebook:insert-cell-below');
        await app.commands.execute('notebook:change-cell-to-code');

        const workerIndex = placeholderIndex + 1;
        const workerCell = nb.widgets[workerIndex];
        const wsm: any = (workerCell.model as any).sharedModel;
        if (typeof wsm.setSource === 'function') {
          wsm.setSource(prompt);
        } else {
          wsm.source = prompt;
        }

        // 3) Run the worker cell
        nb.activeCellIndex = workerIndex;
        await app.commands.execute('notebook:run-cell');

        // 4) Wait for its output text
        const outputs = (workerCell.model as any).outputs;
        let text = await waitForTextFromOutputs(outputs);
        text = stripFences(text);

        if (text && text.trim()) {
          // 5) Put the AI text into the placeholder cell (editable Markdown)
          // keep the placeholder selected
          nb.activeCellIndex = placeholderIndex;
          const phsm2: any = (placeholderCell.model as any).sharedModel;
          if (typeof phsm2.setSource === 'function') {
            phsm2.setSource(text);
          } else {
            phsm2.source = text;
          }
          console.log('[docs-helper] placeholder replaced with AI text');

          // 6) Delete the worker cell (we don’t need it anymore)
          // Recompute the worker's current index from its widget reference
          const currentWorkerIdx = nb.widgets.indexOf(workerCell);
          if (currentWorkerIdx !== -1) {
            nb.activeCellIndex = currentWorkerIdx;
            await app.commands.execute('notebook:delete-cell');
          }

          // 7) Focus the placeholder for immediate editing
          nb.activeCellIndex = placeholderIndex; // after delete, indices shift but placeholder stays at same index
          await app.commands.execute('notebook:enter-edit-mode');
        } else {
          // Nothing came back — leave placeholder as-is and keep worker for inspection
          nb.activeCellIndex = workerIndex;
          // optional: you can also write an error message in the placeholder:
          // const msg = '⚠️ Generation timed out. Re-run the AI button or check the worker cell below.';
          // if (typeof phsm.setSource === 'function') phsm.setSource(msg); else phsm.source = msg;
        }
      }
    });
    palette.addItem({ command: AI_MARKDOWN, category: 'Docs Helper' });

    // helper to add our toolbar button to a given notebook panel (idempotent)
    function ensureAIMarkdownButton(panel: any) {
      if (!panel || !panel.toolbar) {
        return;
      }
      const names = Array.from(panel.toolbar.names());
      if (!names.includes('ai-markdown')) {
        panel.toolbar.insertItem(
          27,
          'ai-markdown',
          new CommandToolbarButton({ commands: app.commands, id: AI_MARKDOWN })
        );
        console.log(
          '[docs-helper] inserted AI: Markdown button on panel',
          panel.id
        );
      } else {
        console.log(
          '[docs-helper] AI: Markdown button already present on panel',
          panel.id
        );
      }
    }

    // Add the button to future notebook panels
    tracker.widgetAdded.connect((_, panel) => {
      ensureAIMarkdownButton(panel);
    });
    // Also add it to any notebook that is already open at activation time
    const current = tracker.currentWidget;
    if (current) {
      ensureAIMarkdownButton(current);
    }
  }
};

export default plugin;

// 1) Extract text from the active code cell's outputs (works for stream & mime bundles)
function extractTextFromOutputs(outputs: any): string {
  if (!outputs || outputs.length === 0) {
    return '';
  }
  // search newest → oldest and return first non-empty text
  for (let i = outputs.length - 1; i >= 0; i--) {
    const out = outputs.get(i).toJSON() as any;

    // stream outputs: { output_type: "stream", text: "..." }
    if (typeof out.text === 'string' && out.text.trim()) {
      return out.text.trim();
    }
    if (Array.isArray(out.text)) {
      const s = out.text.join('').trim();
      if (s) {
        return s;
      }
    }

    // execute/display results with mime bundle
    const md = out.data?.['text/markdown'];
    if (typeof md === 'string' && md.trim()) {
      return md.trim();
    }
    if (Array.isArray(md)) {
      const s = md.join('').trim();
      if (s) {
        return s;
      }
    }
    const plain = out.data?.['text/plain'];
    if (typeof plain === 'string' && plain.trim()) {
      return plain.trim();
    }
    if (Array.isArray(plain)) {
      const s = plain.join('').trim();
      if (s) {
        return s;
      }
    }
  }
  return '';
}

// 2) Optional: strip one pair of ``` fences if the model wraps the answer
function stripFences(s: string): string {
  const t = s.trim();
  if (t.startsWith('```') && t.endsWith('```')) {
    return t
      .replace(/^```[a-zA-Z0-9_-]*\s*/, '')
      .replace(/\s*```$/, '')
      .trim();
  }
  return t;
}

// 3) Wait for outputs to contain non-empty text (handles streaming)
function waitForTextFromOutputs(
  outputs: any,
  timeoutMs = 30000
): Promise<string> {
  return new Promise(resolve => {
    const tryExtract = () => extractTextFromOutputs(outputs);

    // fast path
    const first = tryExtract();
    if (first) {
      return resolve(first);
    }

    // subscribe
    const onChanged = () => {
      const txt = tryExtract();
      if (txt) {
        outputs.changed.disconnect(onChanged);
        resolve(txt);
      }
    };
    outputs.changed.connect(onChanged);

    // safety timeout
    setTimeout(() => {
      outputs.changed.disconnect(onChanged);
      resolve('');
    }, timeoutMs);
  });
}
