# Claude

## 1. Existing code -> interactive artifact
> Please create me an interactive React web application using this code. [Paste React code.]

## 2. Request multiple changes at once
> Make the separate changes, committed one at a time, one-by-one:
> * Do something
> * Do another thing

## 3. Interactive Artifact Code -> deployable HTML file
> Please create me an interactive React web application using this code. It should be a single HTML file that I can download to open in a browser. That means it should use no external dependencies other than tailwind, which can be loaded from a CDN using a link tag. [Paste code.]

## 4. Reduce size to continue iterating on it in a new prompt
> Please find ways to keep this functionally the same, but simplified, with respect to its code. We want to reduce the size of the file without sacrificing functionality. Looks for things that are hardcoded that could be referenced as variables or functions instead of being repeated or in-lined in places. [Paste code.]

## * Catch-all for improvements
> Please improve this [code | UX]

## * 
> Optimize for small file size without sacrificing maintainbility. Do not accomplish this by omitting optional braces or combining multiple lines of code. Instead, think about the entire program as a system. Analzye it for potential patterns abstractions that would ultimately result is less code. Think through whether a change will actually accomplish that before committing to that change. List the changes you've identified and them apply them one-by-one, committing each separately.

## favicon for application
> You're a brilliant graphic artist and UX designer who knows how to strike the perfect balance between simplicity and meaning. Design me an icon that is at least 192 px by 192 px, for a web application [does XYZ | is for XYZ], that I can use as both a favicon and as the default icon in its manifest.json file. Provde me with the icon in SVG format and make sure you specify `width="192"` and `height="192"` in the SVG's XML.

## Apply basic coding guidelines
<blockquote>
The code is looking very messy with respect to white space and syntax. Our code should follow the rules in the list below. Please apply them one-by-one, apply and committing each list item separately as a single update:

* Do not write any comments about applying these rules.
* Prefer guard clauses at the beginning of public and complex private functions.
* Always use "early exits".
* Never use nested if statements.
* Always use brackets when brackets are optional.
* Examine `console.log` uses and make sure to use the appropraite function (e.g. `info`, `warm`, `error`) instead of always using `log`.
* Always use `async`/`await` instead of Promise callbacks.
* Scrutinize `try`/`catch` statements to make sure the `try` portion is only around the actual line(s) of code that are anticipated could fail; do not wrap whole bodies of methods or large pieces of code as a catch-up.
* Always use `const` instead of `var` for variables, unless other code actually mutates the variable.
* Remove superfluous comments. The code should be written such that it's mostly self-documenting.
* Always use camelCase, not `snake_case` or `PascalCase`, for variable names.
* Ternary statements should written on three lines, like this:
    ```condition 
    ? exprIfTrue 
    : exprIfFalse```
* Always use object destructuring. Each destructured variable should be on its own line.
* Always put each property on each line when creating or passing objects or parameters.
* The first property of a new object should always be on the next line after its opening brackets *if* there is more than one property.
* Use the latest JavaScript syntax conventions available that are supported by the version of babel we are using.
</blockquote>

## Apply early level of abstraction in index.html A
> Please make sure the code is well organized and respects separation of concerns. Do not, however, create any new files in the process. Make all the changes here in this single index.htm file, progressing committing each phase of your changes one-by-one. Keep your phases small; commit "early and often."

## Apply early level of abstraction in index.html B
> The code is looking very messy. I need you to go through it and apply best practices. It looks like there's a lot of duplication and missing abstractions. Please made this code ready for PR. One important note, however: you need to make all the changes here in this single index.htm file, progressing committing each phase of your changes one-by-one. 

## Split single file into an entire project (with multiple files)
> The code is looking very messy. I need you to go through it and apply best practices. It looks like there's a lot of duplication and missing abstractions. Please made this code ready for PR.

## Making sure chareges in Node.js project are passing CI
> 
Please add an NPM script to the package.json under key "build:local:ci". Please have this script act as the pass/fail CI pipeline for anytime changes are considered complete and working. Running this script will prove the changes are still compiling.

Please rewrite these tests from scratch. Look at the server.ts contents and figure out what important code paths need to be covered. Anything that causes a return of status code that's not 200 needs a test. Succesful executions that do need return status code 200 need tests too of course. We don't want to overdue it with the number of tests--we want to catch all the major code paths, while trying to mock as little as possible.
You can test using command `npx vitest run`