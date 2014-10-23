# tpt script server frontend

![watch in awe as this design melts your eyeballs off!](http://i.imgur.com/tpKXDpa.png)

Source code for future starcatcher.us/scripts/index.html

## To use: 

Compile SASS into CSS, then use Myth.io or equivalent to prefix/add 
compatibility shims to it. I don't write my CSS with prefixes ;)

Optionally, minify Javascript. Make sure to change browse.html's link to
the new source file name then.

Then, simply place in /scripts/. Calls XMLHttpRequests to ./main.lua in the 
background.

## Note: Dark/Light

Change to the Bright theme by editing the SASS `@import "style_dark";`, and 
then by editing the highlight.js colour theme stylesheet inside browse.html,
from "railscasts.min.css" to "github.min.css".

## Note: inmake

If you have inmake, simply run inmake on both browse.scss and main.js to do the
above automatically. Depends on the NPM package myth, Ruby gem sass and Google 
Closure Compiler.

## License

Copyright 2014 boxmein

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.