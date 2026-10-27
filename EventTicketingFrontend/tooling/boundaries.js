import path from 'node:path';
export const boundaries = {
  meta: { type: 'problem', schema: [], messages: { boundary: '{{message}}' } },
  create(context) {
    return {
      ImportDeclaration(node) {
        const filename = context.filename;
        const source = node.source.value;
        if (typeof source !== 'string' || !source.startsWith('.')) return;
        const sourceParts = filename.split(path.sep);
        const target = path.resolve(path.dirname(filename), source).split(path.sep);
        const src = sourceParts.lastIndexOf('src');
        const dst = target.lastIndexOf('src');
        if (src < 0 || dst < 0) return;
        const from = sourceParts.slice(src + 1);
        const to = target.slice(dst + 1);
        let message;
        if (
          ['lib', 'utils', 'stores', 'components'].includes(from[0]) &&
          ['features', 'app'].includes(to[0])
        )
          message = 'Shared modules cannot depend on app or features.';
        if (from[0] === 'features' && to[0] === 'app') message = 'Features cannot depend on app.';
        if (from[0] === 'features' && to[0] === 'features' && from[1] !== to[1]) {
          const allowed =
            node.importKind === 'type' &&
            ((from[1] === 'countries' && to[1] === 'venues') ||
              (from[1] === 'bookings' && to[1] === 'ticket-categories')) &&
            to[2] === 'public';
          if (!allowed)
            message =
              'Sibling feature runtime imports and unapproved type dependencies are forbidden.';
        }
        if (from[0] === 'app' && to[0] === 'features' && to[2] !== 'public')
          message = 'App composition must use a feature public entry point.';
        if (from[0] === 'features' && from[1] === to[1] && to[2] === 'public')
          message = 'Internal feature modules must import local files directly.';
        if (message) context.report({ node, messageId: 'boundary', data: { message } });
      },
    };
  },
};
