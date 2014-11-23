// 
// Stuff to be done after everything loads
window.addEventListener('load', function() {
  'use strict';  

  var state = 
  window.appState = {};

  var SPINNER = '<div class="spinner"></div>';
  var MAINdotlua = 'main.lua';
  var PASTEdotlua = 'paste.lua';

  // Underscore templates for a single list item, and a script
  var tListItem = _.template($('#listitemtemplate').html());
  var tScript = _.template($('#scripttemplate').html());
  var tSubmitView = _.template($('#submitviewtemplate').html());

  // Last call to 'next page' started off this page!
  state.lastStart = 0;

  // Keep track of all the Scripts we know of.
  // :: [Script]
  state.scriptList = [];

  // Currently viewed script, for when XHRs collide
  state.currentScriptID = -1;



  // Wrapper around history.pushState
  function pushState(stateObj, name, address) {
    if (history) {
      
      if (history.state == stateObj) 
        return;

      history.pushState(stateObj, name, address);
    }
    else 
      window.location.hash = address;
  }


  // Highlight an item in the top navigation thing.
  function highlightNav(id) {
    $('nav .active').removeClass('active');
    $(id).addClass('active');
  }



  // Highlight an item in the left-side script list.
  function highlightScript(id) {

    var $t = $('#script-list-ul li[data-id="'+id+'"]');

    if (!$t) return;
    
    $t.siblings().removeClass('viewing');
    $t.addClass('viewing');
  }
  


  /*
    Represents a script file.

    ID: unique identifier
    title: title/name of the script
    status: LIVE/WAITING - is the script accepted or waiting for acceptance?
    author: writer of the script.

    :: Object -> Script
  */

  function Script(vals) {
    
    // if there's a name property (yes), make it into a title property
    // XHR sends "name"! 
    if (vals && vals.name)
      vals.title = vals.name; 

    this.data = _.extend({
      'ID': -1,
      'title': '',
      'description': '',
      'changelog': '',
      'source': '',
      'version': -1,
      'status': '',
      'author': ''
    }, vals);
  }

  // Default script
  Script.zero = new Script();






  // Parses a textual response from the serverside API into a Script item.
  // Uses evil eval, because it's basically malformed JSON.
  // :: String -> Script
  // Throws eval errors
  Script.fromXHR = function(data) {
    try {
      return eval('(function() { return new Script({ ' + data + ' }); })()');
    } catch (err) {
      throw err;
    }
  };





  function PendingScript(id) {
    if (!id || id < 0)
      throw new Error('invalid ID, can\'t uniquely identify a script to fetch!');

    this.resolve = function() {
      var deferred = new $.Deferred();
      getScriptByID(id).done(deferred.resolve).fail(deferred.fail);
      return deferred;
    };
  }





  // Render a Script into HTML, using the tScript template.
  // :: Script -> HTML
  function renderScript(script) {


    if (!script) 
      throw new Error('passed false value, Script expected!');

    if (script.data.source == '') {

      $('#sourcecodehere').html(SPINNER);

      // TODO: fix race conditions (click on one, then another script, suddenly
      // script's source is not of the one displayed)
      getSourceByID(script.data.ID).then(function(src) {

        // keep the source for later. speeds up loading existing scripts.
        // also, consumes more RAM! :D
        script.data.source = src;

        $('#sourcecodehere').html(src);
        hljs.highlightBlock($('#sourcecodehere')[0]);
      }, function(err) {
        $('#sourcecodehere').html('Error fetching source code: ' + err.status + ' ' + err.statusText);
        console.error(err);
      });

    }
    else {
      // highlight the code block after call stack clears, aka after 
      // returning whenever
      _.delay(function() {
        hljs.highlightBlock($('#sourcecodehere')[0]);
      });
    }

    return tScript(script ? script.data : Script.zero.data);
  }







  // Takes a list of scripts and generates HTML for the script list. 
  // :: [Script] -> HTML
  function renderScriptList(slist) {
    return _.map(slist, function(each) {
      return tListItem(each.data);
    });
  }






  // Fetch a script by its ID
  // :: Number -> $.Deferred Script
  function getScriptByID(a) {

    try {
      var id = parseInt(a, 10);
    } catch (err) {
      throw new Error("script ID wasn't an integer in decimal!");
    }

    var deferred = new $.Deferred();

    $.ajax(MAINdotlua + '?info='+id)
          .fail(deferred.reject)
          .done(function(data) {
      
      if (data == '') 
        deferred.resolve(undefined);
      
      // it's the lesser of two evals
      try {
        var obj = Script.fromXHR(data);
        deferred.resolve(obj);
      } catch (err) {
        deferred.reject(err);
      }

    });
    return deferred;
  }






  // Fetch the source code for a given script ID
  // :: Number -> $.Deferred String
  function getSourceByID(id) {
    var deferred = new $.Deferred();

    $.ajax(MAINdotlua + '?get='+ id)
          .fail(deferred.reject)
          .done(deferred.resolve);

    return deferred;
  }





  // Fetch IDs of scripts, N at a time, starting from <start>
  function getIDs(n, start) {
    var deferred = new $.Deferred();

    n = n || 10; 
    start = 1 + (start || state.lastStart || 0);
    

    // move lastStart by n elements
    // state.lastStart += n;

    // console.log('starting getIDs with start, count', start, n);

    

    $.ajax(MAINdotlua + '?IDs=' + (start !== 0 ? start + '-' : '') + (n+start))
          .fail(deferred.reject)
          .done(function(data) {


      // Data is now like preliminary data: newline-separated list of 
      // metadata

      var objs = data.split('\n'), max = -Infinity;
      objs = _.map(objs, function(each) {
        var obj = Script.fromXHR(each); 
        max = Math.max(max, obj.data.ID);
        return obj;
      });

      state.lastStart = max;

      deferred.resolve(objs);
    });

    return deferred;
  }




  // Display a script via its ID
  // :: Number -> mutate DOM
  function displayScriptByID(id) {
    // ok do we find any?
    var scriptFound = _.filter(state.scriptList, function(ea) {
      return ea.data.ID == id; });

    // sure, render it!
    if (scriptFound.length > 0) {
      var viewhtml = renderScript(scriptFound[0]);
      $('#script-view').html(viewhtml);

      pushState({
        'scriptView': viewhtml,
        'script': scriptFound[0],
        'view': 'show script',

        'activeNav': '#browse-page',
        'activeScriptID': scriptFound[0].data.ID
      }, "view script", '#'+id);


      // event the edit button, too
      $('#to-the-editmobile').click(_.partial(function(scr, evt) {
        submitPage(evt, scr.data);
      }, scriptFound[0]));

    }
    else {
      // didn't find? let's fetch it from the server
      getScriptByID(id).done(function(script) {
        state.scriptList.push(script);
        displayScriptByID(id); // inb4 recursion
      });
    }
  }




  // Print the current script list into the DOM. 
  // Also, attach a click event.
  // :: () -> mutate DOM
  function refreshScriptList() {
    
    // prune the script list of duplicate/weird entries
    state.scriptList = _.reject(_.uniq(state.scriptList), function(e){ 
      return e.data.ID == -1; 
    }); 

    $('#script-list-ul').html(renderScriptList(state.scriptList))
                        .find('li')
                        .click(function(evt) {

      // if we're already looking at the script, no need to re-open it!
      if (evt.target.className.indexOf('viewing')!==-1) 
        return;


      var $target = $(evt.target);

      // go up the tree, find the element that has a data-id attribute.
      if (!$target.data('id'))
        $target = $target.parents('.script-item');

      // now, $target should contain li.script-item[data-id=something]

      $target.siblings().removeClass('viewing');
      $target.addClass('viewing');
      var id = $target.data('id');

      // from id, display a script
      displayScriptByID(id);
    });          
  }




  // Fetch a first set of data to display when nothing extra has loaded
  // :: () -> $.Deferred [Script]
  function getPreliminaryData() {
    return getIDs(15, 0);
  }




  // Mobile collapse functionality
  $('#collapse-list').click(function(evt) {
    $(evt.target.parentNode).toggleClass('collapsed');
  });




  $('#next-page').click(function() {
    $('#next-page').html(SPINNER);

    getIDs().done(function(list) {

      if (list.length == 0) {
        $('#next-page').off('click').addClass('disabled').html('that\'s all!');
      }
      else {
        $('#next-page').html('more');
      }

      _.forEach(list, function(ea) { state.scriptList.push(ea); });
      refreshScriptList();
    });
  });






  // Just, uh, show something on the browse page. Not a script.
  function browsePage(e) {
    if (e && e.preventDefault) 
      e.preventDefault();

    var view = '<h4>Pick a script from the left to view it here.</h4>';

    highlightNav('#browse-page');

    $('#script-view').html(view);

    pushState({
      'activeNav': '#browse-page',
      'scriptView': view,
      'view': 'list scripts'
    }, 'list scripts', '#');
  }

  $('#browse-page').click(browsePage);







  /*

    Submit page functionality

  */

  function submitPage(evt, data) {
    if (evt && evt.preventDefault) 
      evt.preventDefault();

    // you can pass script objects into here, now!
    if (data && data.data) 
      data = data.data;

    highlightNav('#submit-page');

    var scriptView = tSubmitView({'data': data || {}});
    $('#script-view').html(scriptView);

    pushState({
      'scriptView': scriptView,
      'view': 'submit script',
      'activeNav': '#submit-page',
      'script': { 'data': data } || false
    }, 'submit script', '#submit-page');

    // Set up Ace

    var editor = ace.edit('submit-source');
    editor.setOptions({
      minLines: 20,
      maxLines: 500
    });
    editor.setTheme('ace/theme/twilight'); // Close enough to highlight.js
    editor.getSession().setMode('ace/mode/lua');
    editor.getSession().setUseWrapMode(true);

    // On submit...

    $('#submit').click(function onSubmitPageSubmitClick() {
      var $that = $(this);

      $that.html(SPINNER);

      // Turn off multiple submissions
      $that.off('click');

      var submit_form = {
        ID: $(this).data('scriptid'),
        script: editor.getValue(),
        name: $('#submit-title').val(),
        author: $('#submit-author').val(),
        description: $('#submit-description').val(),
        changelog: $('#submit-changelog').val()
      };

      $.ajax(PASTEdotlua, {
        'method': 'POST', 
        'data': submit_form
      }).then(function(data, txtstatus){
        if (txtstatus == 'success') {
          $that.html('this submission is now in the mod queue :D');
          // On a successful submit, don't add the submit button back
        }
        else {
          $that.html('something went wrong. look! a word!: ' + txtstatus);
          $that.click(onSubmitPageSubmitClick);
        }

      },function(err){
        $that.html('submission failed: ' + err);
        $that.click(onSubmitPageSubmitClick);
      });
    });

  }

  $('#submit-page').click(submitPage);





  // List some 'renderers' for popState 
  // :: Script -> String
  var renderers = {
    'show script': tScript,
    'submit script': _.partial(submitPage, null)
  };



  // Back button functionality
  window.onpopstate = function(evt) {
    // console.log(evt); 

    // If we have a navigation button that should be .active, make it .active!
    if (evt.state.activeNav) {
      highlightNav(evt.state.activeNav);
    }

    // If we ve a script-list item that should be .active, make it .active!
    if (evt.state.activeScriptID) {
      highlightScript(evt.state.activeScriptID);
    }

    // If we have a scriptView stored, then display it.
    if (evt.state.scriptView) {
      $('#script-view').html(evt.state.scriptView);

      var el = $('#sourcecodehere')[0];
      if (el)  
        hljs.highlightBlock(el);

      return;
    }

    if (evt.state.script && evt.state.view == 'view script') {
      displayScriptByID(evt.state.script.data.ID);
    }

  };







  getPreliminaryData().done(function(data) {
    [].push.apply(state.scriptList, data);
    
    // UX over anything lol
    $('#script-view').html('<h4>Pick a script from the left to view it here.</h4>');
    

    // I wonder what this does
    refreshScriptList();

    // Handle hash after we have the data from our script fetch
    
    if (location.hash && location.hash == '#submit-page') {
      submitPage();
    }
    else if (location.hash && /^#(\d+)$/.test(location.hash)) {
      try {
        var num = parseInt(location.hash.match(/^#(\d+)$/)[1], 10);
        displayScriptByID(num);
      } catch (err) {}
    } 
  }).fail(function(err) {
    $('#script-view').html('error downloading initial set of data: ' + err);
  });

});
