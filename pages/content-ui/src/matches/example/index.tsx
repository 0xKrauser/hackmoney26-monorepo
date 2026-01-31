import inlineCss from '../../../dist/example/index.css?inline';
import { initAppWithShadow } from '@repo/shared';
import App from '@src/matches/example/App';

initAppWithShadow({ id: 'CEB-extension-example', app: <App />, inlineCss });
