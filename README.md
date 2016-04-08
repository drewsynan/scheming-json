# scheming-json
😏 A lightweight, functional library for describing and validating JSON and JavaScript data. Scheming JSON tries to make the description of your data as close to what your data actually is as possible (your schemas look like your data, and your data looks like your schemas).

#Describing JSON
Let's say we have some data we want to validate
```javascript
var data = {articles: 
  [{
      title: 'The Title',
      author: 'The Author',
      published: '1/7/53',
      tags: [
        {tagName: 'Stuff'},
        {tagName: 'Garbage'},
        {tagName: 'uninteresting'}
      ]
    },
    {
      title: 'A title',
      author: 'Somebody else',
      published: '1/8/53',
      tags: [
        {tagName: 'Stuff'}
      ]
    }
  ]};
```
How would we create rules that determine if it's valid or not? An example scheming json ruleset (schema) for our data could look like this:
```javascript
var schema = {articles: 
  [{
    title: isString,
    author: isString,
    published: isDateString,
    tags: [{tagName: isString}]
  }]
};
```
Which says that we have a root object with a key called `articles`, which contains an array of one or more objects each having a key called `title` (whose type is a string), `author` (also a string), `datePublished` (using a custom type called `dateString` that we defined), and `tags`, which contains an array of objects (each object having only one field named `tagName`, whose type is a string).

To translate our ruleset into something that we can evaulate json and javascript variables on, we need a parser function. To get a function the parser, use the `parser` function, and apply it to some data to parse.
```javascript
var articlesParser = parser(schema);

var articlesValid = articlesParser(someArrayofArticles); // => true
// hooray!
```

Alternatively, we could build up smaller schema pieces, and then combine them:
```javascript
var tag = {tagName: isString};
var article = {title: isString, author: isString, published: isDateString, tags: [tag]};
var articles = {articles: [article]};
```
All of the type checkers (like `isString` or `isDateString`) are just functions that take some input and return either true or false (a "predicate"). The function could be something from the JavaScript core (`Array.isArray`), something that we define is a one off (`function greaterThanThree(x){return x>3;}`), or a parser that we've generated previously (like the parser functioned returned by `parser(tag)`)

### See the [docs](https://drewsynan.github.io/scheming-json/) for more!
