# scheming-json
😏 A lightweight, functional library for describing and validating JSON and JavaScript data

#Describing JSON
Consider the JSON structure 
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
We could describe this using scheming json like so:
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
And get a parser function using
```javascript
var articlesParser = parser(schema);

var articlesValid = articlesParser(someArrayofArticles); // => true
// hooray!
```

Where the functions `isString`, and `isDateString` are user-defined (or library-defined) boolean-returning functions ("predicates").

Alternatively, we could build up smaller schema pieces, and then combine them:
```javascript
var tag = {tagName: isString};
var article = {title: isString, author: isString, published: isDateString, tags[tag]};
var articles = {articles: [article]};
```


### See the docs for more!
