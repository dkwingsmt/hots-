import _ from 'lodash';

import { findNearestColor } from './color';
import { Attribute, Node } from './const';

function parseStyle(node: Node): Record<string, string> {
  if (node.kind === 'text') {
    return {};
  }
  const styleAttr = node.attrs.find((v: Attribute) => v.name === 'style');
  if (!styleAttr) {
    return {};
  }
  const styles = styleAttr.value
    .split(';')
    .map(_.trim)
    .filter(Boolean)
    .map((s: string) => s.split(':'))
    .map(([a, b]: string[]) => [_.trim(a), _.trim(b)])
    .filter((v: string[]) => v.length === 2);

  return _.fromPairs(styles);
}

function findAttr(node: Node, field: string): Attribute | undefined {
  if (node.kind === 'text') {
    return undefined;
  }

  return node.attrs.find((attr: Attribute) => attr.name === field);
}

function getNumAttr(node: Node, attr: string) {
  if (node.kind === 'text') {
    return null;
  }
  const attrObj = node.attrs.find((v: Attribute) => v.name === attr);
  if (!attrObj) {
    return null;
  }

  return attrObj.value;
}

function trimNewlines(str: string): [string, number, number] {
  const trimmedLeft = _.trimStart(str, '\n');
  const left = str.length - trimmedLeft.length;
  const trimmedRight = _.trimEnd(trimmedLeft, '\n');
  const right = trimmedLeft.length - trimmedRight.length;

  return [trimmedRight, left, right];
}

interface INewlines {
  inStart?: number;
  inEnd?: number;
  outBefore?: number;
  outAfter?: number;
  outBoth?: number;
}

interface IGenerationNode {
  tag?: string;
  tagSuffix?: string;
  children?: (IGenerationNode | string)[];
  newlines?: INewlines;
  alwaysKeep?: boolean;
}

type GenerationChild = IGenerationNode | string;

// tslint:disable-next-line:max-func-body-length cyclomatic-complexity
function bbsTreeToGenerationTree(node: Node): GenerationChild {
  if (node.kind === 'text') {
    return _.trim(node.text);
  }

  // Node types to skip
  if (_.includes(['style', 'script', '#comment'], node.tag)) {
    return '';
  }

  const style = parseStyle(node);
  let children = node.children.map(bbsTreeToGenerationTree);
  // <picture>: pick only the first child
  if (node.tag === 'picture') {
    children = children.slice(0, 1);
  }

  // Wrap children with styles
  if (style.color) {
    const ngaColor = findNearestColor(style.color);
    children = [{
      tag: 'color',
      tagSuffix: `=${ngaColor}`,
      children,
    }];
  }

  switch (node.tag) {
  case 'br':
    return {
      newlines: {
        outBoth: 1,
        alwaysKeep: true,
      },
    };
  case 'hr':
    return {
      children: ['======'],
      newlines: {
        outBefore: 1,
        outAfter: 1,
        alwaysKeep: true,
      },
    };
  case 'figure':
    return {
      children,
      newlines: {
        outBefore: 1,
        outAfter: 1,
      },
    };
  case 'table':
    return {
      tag: node.tag,
      children,
      newlines: {
        outBefore: 1,
        outAfter: 1,
        inEnd: 1,
      },
    };
  case 'tbody':
  case 'thead':
    return {
      children,
    };
  case 'tr':
    return {
      tag: 'tr',
      children,
      newlines: {
        outBefore: 1,
        outAfter: 1,
        inEnd: 1,
      },
    };
  case 'th':
  case 'td': {
    const colspan = getNumAttr(node, 'colspan');
    const colspanStr = colspan ? ` colspan=${colspan}` : '';
    const rowspan = getNumAttr(node, 'rowspan');
    const rowspanStr = rowspan ? ` rowspan=${rowspan}` : '';
    // const boldChildren = node.tag === 'th' ? `[b]${children}[/b]` : children;

    return {
      tag: 'td',
      tagSuffix: `${rowspanStr}${colspanStr}`,
      children,
      newlines: {
        outBefore: 1,
        outAfter: 1,
      },
      alwaysKeep: true,
    };
  }
  case 'h1':
  case 'h2':
  case 'h3':
  case 'h4':
  case 'h5': {
    const sizes = {
      h1: 150,
      h2: 140,
      h3: 130,
      h4: 120,
      h5: 110,
    };

    return {
      tag: 'size',
      tagSuffix: `=${sizes[node.tag]}%`,
      children: [{
        tag: 'b',
        children,
      }],
      newlines: {
        outBefore: 2,
        outAfter: 1,
      },
    };
  }

  case 'p':
    return {
      children,
      newlines: {
        outBefore: 1,
      },
    };
  case 'strong':
  case 'b':
    return {
      children,
      tag: 'b',
    };
  case 's':
    return {
      children,
      tag: 'del',
    };
  case 'u':
    return {
      children,
      tag: 'u',
    };
  case 'em':
  case 'i':
    return {
      children,
      tag: 'i',
    };
  case 'sup':
    return {
      children,
      tag: 'sup',
    };
  case 'sub':
    return {
      children,
      tag: 'sub',
    };
  case 'blockquote':
    return {
      children,
      tag: 'quote',
      newlines: {
        outBefore: 1,
        outAfter: 1,
        inEnd: 1,
      },
    };
  case 'ul': {
    return {
      children,
      tag: 'list',
      newlines: {
        outBefore: 1,
        outAfter: 1,
        inEnd: 1,
      },
    };
  }
  case 'ol': {
    return {
      children,
      tag: 'list',
      tagSuffix: '=1',
      newlines: {
        outBefore: 1,
        outAfter: 1,
        inEnd: 1,
      },
    };
  }
  case 'li': {
    return {
      children: [<GenerationChild>'[*]'].concat(children),
      newlines: {
        outBefore: 1,
        outAfter: 1,
      },
    };
  }

  case 'img': {
    const src = findAttr(node, 'src');
    if (src) {
      return {
        children: [src.value],
        tag: 'img',
        newlines: {
          outBefore: 1,
          outAfter: 1,
        },
      };
    }

    return '';
  }

  case 'article':
  case 'picture':
  case 'span':
  case 'a':
  case 'div':
  case 'font':
    return {
      children,
    };

  default:
    console.warn(`Unhandled node type ${node.tag}`);

    return {
      children,
    };
  }
}

function genTreeToString(node: GenerationChild): [string, number, number] {
  if (typeof node === 'string') {
    return [node, 0, 0];
  }

  const [childrenStrReturned, childrenEndNL] = _.reduce<GenerationChild, [string, number]>(
    node.children,
    ([prevStr, prevNLAfter]: [string, number], curChild: GenerationChild) => {
      const [nextStr, nextNLBefore, nextNLAfter] = genTreeToString(curChild);
      const nextNLStr = _.repeat('\n', Math.max(prevNLAfter, nextNLBefore));

      return [
        `${prevStr}${nextNLStr}${nextStr}`,
        nextNLAfter,
      ];
    },
    ['', (node.newlines || {}).inStart || 0],
  );
  const childrenEndNLStr = _.repeat('\n', Math.max(childrenEndNL, (node.newlines || {}).inEnd || 0));
  const childrenStr = `${childrenStrReturned}${childrenEndNLStr}`;

  let realChildrenStr;
  if (!node.alwaysKeep && !_.trim(childrenStr)) {
    realChildrenStr = '';
  } else {
    const tagSuffix = node.tagSuffix || '';
    const startTag = node.tag ? `[${node.tag}${tagSuffix}]` : '';
    const endTag = node.tag ? `[/${node.tag}]` : '';
    realChildrenStr = `${startTag}${childrenStr}${endTag}`;
  }

  return [
    realChildrenStr,
    (node.newlines || {}).outBefore || 0,
    (node.newlines || {}).outAfter || 0,
  ];
}

export function generateBbsCode(node: Node): string {
  const genTree = bbsTreeToGenerationTree(node);

  return genTreeToString(genTree)[0];
}
