const fs = require('fs');
const traverse = require('@babel/traverse').default;
const parser = require('@babel/parser')
const t = require('@babel/types')
const generator = require('@babel/generator').default
const { Tags } = require('../constants/constants')
const uuid = require('uuid')
const wxml = require('wxml')

// 读取目录 
function readDir({ dirPath }) {
  fs.readdir(dirPath, (err, files) => {
    if (err) {
      console.error({
        message: `fs.readdir ${dirPath} error`,
        err,
      })
      return
    }
    files.forEach(file => {
      const filePath = `${dirPath}/${file}`
      if (fs.statSync(filePath).isFile()) {
        // 是文件
        const suffix = file.slice(file.lastIndexOf('.') + 1);
        if (['tsx', 'jsx', 'wxml', 'ttml'].includes(suffix)) {
          fs.readFile(filePath, 'utf-8', (err, data) => {
            if (err) {
              console.error({
                message: `fs.readFile ${filePath} error`,
                err,
              })
              return
            }
            const idPrefix = `${dirPath.slice(dirPath.lastIndexOf('/') + 1)}-${file.slice(0, file.indexOf('.'))}`;
            let _transCode = transJsxCode
            if (['wxml', 'ttml'].includes(suffix)) {
              _transCode = transWxmlCode
            }
            fs.writeFile(filePath, _transCode(data, idPrefix), (err) => {
              if (err) {
                console.error({
                  message: `fs.writeFile ${filePath} error`,
                  err,
                })
                return
              }
              console.log(`fs.writeFile ${filePath} success`)
            })
          })
        }
      } else {
        // 是目录
        readDir({dirPath: filePath})
      }
    })
  })
}

// 将tsx转成ast https://babeljs.io/docs/babel-parser
function transJsxCode(code, idPrefix) {
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  })

  const elementTypes = ['JSXOpeningElement']
  traverse(ast, {
    enter(path) {
      if (path?.node?.type && elementTypes.includes(path.node.type) && path.node.name && Tags.includes(path.node.name?.name)) {
        const { attributes = [] } = path.node
        if (!attributes.filter(attr => attr.name?.name === 'id' || attr.name === 'id')?.length) {
          const idAttr = t.jsxAttribute(t.jsxIdentifier('id'), t.stringLiteral(`${idPrefix}-${uuid.v1()}`));
          if (path.node.attributes) {
            path.node.attributes.push(idAttr)
          } else {
            path.node.attributes = [idAttr]
          }
        }
      }
    }
  })

  const newCodeObj = generator(ast, {
    retainLines: true,
  })
  return newCodeObj?.code || code;

}

function transWxmlCode(code, idPrefix) {
  const ast = wxml.parse(code)
  wxml.traverse(ast, function visitor(node, parent) {
    const type = node.type;
    const parentNode = node.parentNode;
  
    if (type === wxml.NODE_TYPES.ELEMENT) {
      // handle element node
      const tagName = node.tagName;
      if (Tags.includes(tagName)) {
        const attributes = node.attributes; // an object represents the attributes
        // const childNodes = node.childNodes;
        // const selfClosing = node.selfClosing; // if a node is self closing, like `<tag />`
        if (!attributes.id) {
          attributes.id = `${idPrefix}-${uuid.v1()}`
        }
      }
    } else if (type === wxml.NODE_TYPES.TEXT) {
      // handle text node
      const textContent = node.textContent;
    } else if (type === wxml.NODE_TYPES.COMMENT) {
      // handle comment node
      const comment = node.comment;
    }
  });
  const newCode = wxml.serialize(ast);

  return newCode || code;
}

module.exports = {
  readDir,
}