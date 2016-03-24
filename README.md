# scheming-json
A lightweight functional library for describing and validating JSON and JavaScript data

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
Where the functions `isString`, and `isDateString` are boolean-returning functions that we've defined.

Alternatively, we could build up smaller schema pieces, and then combine them:
```javascript
var tag = {tagName: isString};
var article = {title: isString, author: isString, published: isDateString, tags[tag]};
var articles = {articles: [article]};
```

To get a parser function that will validate a JavaScript object use the `parser` function
```javascript
var singleArticleParser = parser(article);
```

##Special values
###**
** says that we should apply the predicate to all other fields in an object that we haven't already specified.

For example, this would also match our article example
```javascript
var singleArticleAlt = {
  title: isString,
  tags: [tag],
  '**': isString
};
```
This says 'match an object with a key named `title` that's a string, with a key named `tags` holding an array of tag objects, and with 0 or more keys named anything that are all strings.

###*
`*` says that we should ignore either the key name or the type of value
```javascript
var acceptAllNames = {name: '*'};
```
Will match any object with one key called `name` that has any value.

`*` can also appear in the key selector
```javascript
var nameAndFunc = {name: '*', '*': isFunction};
```

`*` can be used for multiple key value wildcards. However, since JavaScript object keys must be unique, it must be
written like `*something*` (any arbitrary name between two *s).

```javascript
var twoStrings = {'*a*': isString, '*b*': isString};
```
This operator is super buggy right now :-(

###{} and []
The empty object and empty array predicates will match either an object or an array, but not look at its contents.
If we didn't care about the contents of our article tags we could have written
```javascript
var tagsPresentButUnaccountedFor = {title: isString, author: isString, published: isDateString, tags []};
```

If all we wanted to do was make sure that each article in our article array was an object
```javascript
var articles_array = {articles: [{}]};
```

Both the empty array and empty object notation are shorthands for `isArray` and `isObject` predicates.

###$...$
The dollar sign operators allow lookup of sibling key values within the same object.

```javascript
  {title: isString, author: myCoolLookupFunction('$title$')}
```

Coming soon: how to write functions that can accept `$...$` arguments.


#Composing predicate functions
The `compose1PredsWith` function takes an array of 1-argument predicates and pipes them together using `glue`.
By default, predicates are glued together with `&&`.

As an example, let's make a predicate that only allows non-empty arrays
```javascript
var isNonEmptyArray = compose1PredsWith([function(v){return !isEmpty(v)}, isArray], and);
```
or a one that allows either an empty array or an array of tags
```javascript
var maybeTags = compose1PredsWith([parser([tag]), isEmptyArray], or);
```
