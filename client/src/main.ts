import './styles.css';
import { route } from './router';

const root = document.getElementById('app');
if (root) {
  route(root);
}