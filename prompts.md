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
1. > Please improve this [code | UX]
2. > The code is looking very messy. I need you to go through it and apply best practices. It looks like there's a lot of duplication and missing abstractions. Please made this code ready for PR.

## * 
> Optimize for small file size without sacrificing maintainbility. Do not accomplish this by omitting optional braces or combining multiple lines of code. Instead, think about the entire program as a system. Analzye it for potential patterns abstractions that would ultimately result is less code. Think through whether a change will actually accomplish that before committing to that change. List the changes you've identified and them apply them one-by-one, committing each separately.

## favicon for application
> You're a brilliant graphic artist and UX designer who knows how to strike the perfect balance between simplicity and meaning. Design me an icon that is at least 192 px by 192 px, for a web application [does XYZ | is for XYZ], that I can use as both a favicon and as the default icon in its manifest.json file. Provde me with the icon in SVG format and make sure you specify `width="192"` and `height="192"` in the SVG's XML.