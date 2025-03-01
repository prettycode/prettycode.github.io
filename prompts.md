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