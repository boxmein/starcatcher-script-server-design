# tpt script server frontend

![watch in awe as this design melts your eyeballs off!](http://i.imgur.com/tpKXDpa.png)

Source code for future starcatcher.us/scripts/index.html

## Hosting

To host this design on your site, you need:

### The server-side!

The rest of the script server's server-side. This is usually the file
"main.lua", as well as all the scripts uploaded to it.

### The files!

To run a few programs to generate the rest of the files from this source.
Or, as an alternative, get the package.tar.gz file from under releases. 
This contains the newest generation result, without the source code. Useful
if you're @cracker64!

This running-of-the-programs is primarily done with the command `make`, 
however before doing that you will need a few programs that will generate
HTML / CSS from the weird languages I use.

Those programs are: [`sass`][sass], [`myth`][myth] and [`jade`][jade]. 
The first two are used to make beautiful and compatible CSS from my SASS 
stylesheet, and `jade` isused to make a HTML page from the two .jade files 
and all the partials. 

To compile the Javascript source code into a more minimal version, I use the 
[`uglify-js`][uglify] tool, which you can also obtain via the Node Package
Manager. 

You can obtain `myth`, `jade` and `uglify-js` as Node.js packages with the 
exact same names. Just run the below command to get them:

    npm install -g myth jade uglify-js

SASS you can obtain in whichever way most comfortable, but if you use Ruby and
RubyGems, then it's as easy as the command below:

    gem install sass

After all those dependencies have been resolved, you can run `make` to get 
HTML and CSS!

[sass]: http://sass-lang.com/
[jade]: http://jade-lang.com/
[myth]: http://myth.io/
[uglify]: https://github.com/mishoo/UglifyJS

## License

Copyright 2014 boxmein

Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed
under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
CONDITIONS OF ANY KIND, either express or implied. See the License for the
specific language governing permissions and limitations under the License.