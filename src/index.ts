import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the jupyterlab_docs_helper extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab_docs_helper:plugin',
  description: 'Extension for Suggestting Markdown for Jupyter code cells',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension jupyterlab_docs_helper is activated!');
  }
};

export default plugin;
