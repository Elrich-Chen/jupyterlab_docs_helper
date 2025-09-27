# 📓 jupyterlab_docs_helper

> Turn notebook code into **editable Markdown explanations** with one click.  
> Local-first by default (via **Ollama**), but works with any Jupyter AI provider.

---

## ✨ What is this?

A JupyterLab extension that inserts a **Markdown note** above your current code cell.  
It shows a visible placeholder (“⏳ Generating…”) while an AI worker runs (`%%ai` from **Jupyter AI**), then **replaces the placeholder with clean, editable Markdown**. You tweak and ship.

Why this matters: documentation lives **where you work** (the notebook), not in a separate app you’ll forget to update.

---

## 🧠 Why I built this (the story)

I love the **business analysis** side of CS: explain the “what/why” alongside the “how.” In practice, I would code first and document later — which meant docs were rushed or missing. I wanted a muscle-memory flow:

- Press a button → get a first-draft explanation → **edit right away** in the notebook.

This extension is that tiny workflow upgrade.

---

## 📚 Academic research we touched

- **HAConvGNN (Human-AI collaboration in Notebooks)**  
  → Observed that authors often want **many-cells-to-one-markdown summarization**. They suggested the need for **flexible granularity** — not just one-cell blurbs but sometimes merging explanations across cells.

- **Themisto (and related projects)**  
  → Explored showing **trust signals** when LLMs generate documentation (highlight salient tokens, link to API docs, show confidence indicators). That improves user confidence.

- **General notebook literature (usability & reproducibility studies)**  
  → Repeatedly shows that **documentation quality** is a major barrier to collaboration & reproducibility. Automated or semi-automated Markdown helpers directly address that pain.

> [HAConvGNN Paper](https://www.researchgate.net/publication/350625539_HAConvGNN_Hierarchical_Attention_Based_Convolutional_Graph_Neural_Network_for_Code_Documentation_Generation)

---

## 🧭 Business analyst “gap” framing

**Baseline (already exists):**

- Jupyter AI extension (`%%ai`, chat panel).
- Export tools like nbconvert/Sphinx (great for full-doc outputs **after** the work, not for **cell-level** summaries in place).

**Your differentiator:**

1. **Cell-level helpers** → short “What this does / Why it matters” blurbs per cell.
2. **Granularity control** → ability to merge/split documentation across cells.
3. **Trust & correctness** → suggestions are visible and editable; room for provenance/confidence signals.

**Scope advice:**

- **MVP:** stub insertion + optional AI replace.
- **Later:** merging across cells, provenance/trust indicators, model picker, batch operations.

---

## 🧰 Requirements

- **JupyterLab ≥ 4.0.0**
- **Jupyter AI** (provides the `%%ai` cell magic)

```bash
pip install jupyter-ai
```

- **A model provider**
  - **Local/private (recommended):** **Ollama**

```bash
# macOS
brew install ollama
ollama serve
ollama pull llama3.1
```

- Or OpenAI / Hugging Face / TogetherAI / Gemini — anything supported by Jupyter AI.

> ✅ **Sanity check (run in a notebook cell):**
>
> ```bash
> %%ai ollama:llama3.1
> Say hi in one short sentence.
> ```

---

## 🚀 Install (development)

```bash
git clone https://github.com/Elrich-Chen/jupyterlab_docs_helper.git
cd jupyterlab_docs_helper

# install deps & build (uses JupyterLab’s pinned yarn)
jlpm install
jlpm build

# link into your JupyterLab environment
jupyter labextension develop . --overwrite

# run Lab
jupyter lab
```

---

## ▶️ How to use

1. Place your cursor in a **code cell** you want explained.
2. Click **AI: Markdown** on the notebook toolbar.
3. A **Markdown placeholder** appears above: “⏳ Generating…”.
4. The AI worker runs under the hood using `%%ai`, then replaces the placeholder with **editable Markdown**.
5. The temporary worker cell is removed; you continue editing the Markdown note directly.

---

## 🐣 Beginner FAQ

**Do I need Ollama?**  
Only if you want **local/private** inference with **no API keys**. Otherwise, switch the model to OpenAI/HF/etc. and set their environment variables.

**Where does the text go?**  
Into a **normal Markdown cell** in your notebook (so you can edit immediately).

**What if nothing shows up?**

- Confirm `%%ai` works in a fresh cell (see sanity check above).
- Ensure `ollama serve` is running and a model is pulled.
- Hard-reload your JupyterLab browser tab after installing the extension.

**Can I document multiple cells at once?**  
Not in the MVP. Roadmap includes **multi-cell merging** and **granularity controls**.

---

## 🔧 Configuring models

This extension uses `%%ai` under the hood. Find the line that looks like:

```
%%ai ollama:llama3.1
```

Swap it for any model ID Jupyter AI recognizes, e.g.:

- `openai-chat:gpt-4o`
- `huggingface_hub:owner/model-id`
- `togetherai:DiscoResearch/DiscoLM-mixtral-8x7b-v2`

Remember to export the correct API keys for your chosen provider (e.g., `OPENAI_API_KEY`, etc.).

---

## 🛠️ Developer notes

**Key files**

- `src/index.ts` — registers the **AI: Markdown** command and inserts the toolbar button programmatically.
- `schema/plugin.json` — optional toolbar wiring via schema.
- `package.json`, `tsconfig.json` — standard extension config.

**Dev loop**

```bash
jlpm watch     # rebuild on save
jupyter lab    # run Lab in another terminal
```

Refresh your browser tab to load changes after builds.

**How it works (high-level)**

- Reads the active code cell’s source.
- Inserts a **Markdown placeholder** above the cell.
- Creates a hidden **worker** cell with a `%%ai` prompt and runs it.
- Waits for text output → replaces the placeholder with Markdown.
- Deletes the worker cell → focuses the Markdown for editing.

---

## 🗺️ Roadmap

- Model picker (toolbar dropdown)
- Timeout/error messages & retries in the placeholder
- **Granularity controls** (merge/split across cells)
- Provenance/trust signals (confidence, salient tokens, links to docs)
- Batch “Explain selected cells”
- Export summarized sections to a report

---

## 🎥 Demo (add later)

---

## 🙏 Credits

- Built from the mindset of a **business analyst**: make code tell its story.
- **Jupyter AI** for the `%%ai` magic; **Ollama** for local models.
- Research inspirations:
  - **HAConvGNN** — Human-AI collaboration in notebooks; need for **many-cells → one markdown** and variable granularity.
  - **Themisto** — trust/UX signals for AI-generated docs (confidence, salient tokens, API links).
  - **Notebook usability & reproducibility literature** — documentation as a core friction point.

---

## 📜 License

MIT
