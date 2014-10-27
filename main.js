// 
// Stuff to be done after everything loads
window.addEventListener('load', function() {
  'use strict';  

  var state = 
  window.appState = {};

  var SPINNER = '<div class="spinner"></div>';
  var MAINdotlua = '../main.lua';
  var PASTEdotlua = '../paste.lua';

  // Underscore templates for a single list item, and a script
  var tListItem = _.template($('#listitemtemplate').html());
  var tScript = _.template($('#scripttemplate').html());
  var tSubmitView = _.template($('#submitviewtemplate').html());

  // Last call to 'next page' started off this page!
  state.lastStart = 0;

  // Keep track of all the Scripts we know of.
  // :: [Script]
  state.scriptList = [];

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

    n = n ||10; 

    start = 1 + (start || state.lastStart ||0);
    
    // move lastStart by n elements
    state.lastStart += n;

    console.log('starting getIDs with start, count', start, n);

    $('#next-page').html(SPINNER);

    $.ajax(MAINdotlua + '?IDs=' + (start !== 0 ? start + '-' : '') + (n+start))
          .fail(deferred.reject)
          .done(function(data) {

      console.log('got response, now parsing it', data);

      // Parse the data into an array of ints
      // also, a necessary evil.

      var arr = eval("(function(){return [" + data + "];})()");

      if (arr.length == 0) {
        $('#next-page').off('click').addClass('disabled').html('that\'s all!');
      }
      else 
        $('#next-page').html('more');

      deferred.resolve(arr);
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
    if (scriptFound) {

      $('#script-view').html(renderScript(scriptFound[0]));
      window.location.hash = id;
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
    var deferred = new $.Deferred();
    $.ajax(MAINdotlua)
           .fail(deferred.reject)
           .done(function(data) {
      var objs = [], lines = data.split('\n');
      var max = 0;
      
      objs = _.map(lines, function(each) {
        var scr = Script.fromXHR(each);
        console.log('fetched script', scr); 
        max = Math.max(max, scr.data.ID);
        return Script.fromXHR(each);
      });
      // max should be the last ID we fetched preliminarily
      state.lastStart = max;
      
      deferred.resolve(objs);
    });
    return deferred;
  }

  // Mobile collapse functionality
  $('#collapse-list').click(function(evt) {
    $(evt.target.parentNode).toggleClass('collapsed');
  });

  // Test loading IDs
  $('#next-page').click(function(evt) {
    getIDs().done(function(list) {

      _.forEach(list, function(ea) {
        var scr = new PendingScript(ea); 
        state.scriptList.push(scr);

        scr.resolve().done(function(finished) {
          var i = state.scriptList.indexOf(scr);
          
          if (i === -1) {
            // how did I get here?
            state.scriptList.push(finished);
          }
          else {
            state.scriptList[i] = finished;
          }

          refreshScriptList();
        });
      });
      
    });
  });




  /*

    Submit page functionality

  */

  function submitPage(evt, data) {
    if (evt && evt.preventDefault) evt.preventDefault();
    
    // Still add a hash to show we're on a different page
    window.location.hash = '#submit-page';
    window.scrollTo(0, 0);

    $('nav .active').removeClass('active');
    $(this).addClass('active');

    $('#browse-page').one('click', function() {
      $('nav .active').removeClass('active');
      $(this).addClass('active');
      $('#script-view').html('<h4>Pick a script on the left to view it.</h4>');
    });

    $('#script-view').html(tSubmitView({data: {}}));

    // Set up Ace

    var editor = ace.edit('submit-source');
    editor.setOptions({
      minLines: 20,
      maxLines: 500
    });
    editor.setTheme('ace/theme/twilight'); // Close enough
    editor.getSession().setMode('ace/mode/lua');

    // On submit...

    $('#submit').click(function(evt) {
      $(this).html(SPINNER);

      // collect the form elements

      var submit_form = {
        ID: $(this).data('scriptid'),
        script: editor.getValue(),
        name: $('#submit-title').val(),
        author: $('#submit-author').val(),
        description: $('#submit-description').val(),
        changelog: $('#submit-changelog').val() 
      };

      console.log(submit_form, $.param(submit_form));

      $.ajax(PASTEdotlua, {
        'method': 'POST', 
        'data': submit_form
      }).then(function(data, txtstatus){
        if (txtstatus == 'success')
          $(this).html('this submission is now in the mod queue :D');
        else
          $(this).html('something went wrong. look! a word!: ' + txtstatus);
      },function(err){
        $(this).html('submission failed: ' + err);
      });
    });
  }

  $('#submit-page').click(submitPage);
  
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
