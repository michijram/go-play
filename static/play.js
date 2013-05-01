/**
  Javascript for GO play - a local web service to compile and run go code.

  Some of this was code was in the original
  misc/goplay in edit.html.  Some was in playground.js.

  I would like playground.js to disappear and get merged here.

**/
"use strict"

// Check to see if we have HTML-5 File API support.
function have_file_support() {
    return window.File && window.FileReader && window.FileList;
}

// Return a string containing the Go code.
function go_code_body() {
    return document.getElementById("code").value;
}

function save() {
    var save_path = document.getElementById("saveLoc").value;
    var go_code = go_code_body();

    // var go_blob = new Blob([go_code], { type: "text/plain" });
    // go_blob.append(go_code);
    // saveAs(go_code, "/tmp/new-save.go");
    var xh_req = new XMLHttpRequest();

    if (save_path == "") { save_path = "saved.go" }
    xh_req.open("POST", "/save/" + save_path, true);
    xh_req.setRequestHeader("Content-Type", "text/plain; charset=utf-8");
    xh_req.send(go_code);

    // FIXME: we should get this from the response.
    alert(save_path + " saved");
    var path = xh_req.responseText;
    // saveLoc.show().val(save_path).focus().select();

    // if (rewriteHistory) {
    //     var historyData = {"code": sharingData};
    //     window.history.pushState(historyData, "", path);
    //     pushedEmpty = false;
    // }
}

function load(evt) {
    // Loop through the FileList looking for go files.
    var file = evt.target.files[0]; // FileList object
    var data = ""
    var reader = new FileReader();

    // Closure to capture the file information.
    reader.onload = (function(theFile) {
        return function(e) {
            data = e.srcElement.result
            document.getElementById("code").value = data
        };
    })(file);
    reader.readAsText(file)
    document.getElementById("saveLoc").value = file.name

  }

var xml_req;

// Compile and run go program.
function run() {
    var go_code =  go_code_body();
    var xh_req = new XMLHttpRequest();

    xml_req = xh_req;
    xh_req.onreadystatechange = compileUpdate;
    xh_req.open("POST", "/compile", true);
    xh_req.setRequestHeader("Content-Type", "text/plain; charset=utf-8");
    xh_req.send(go_code);
}

// autoindent helpers.
function insertTabs(n) {
    // find the selection start and end
    var start = code[0].selectionStart;
    var end   = code[0].selectionEnd;
    // split the textarea content into two, and insert n tabs
    var v = code[0].value;
    var u = v.substr(0, start);
    for (var i=0; i<n; i++) {
        u += "\t";
    }
    u += v.substr(end);
    // set revised content
    code[0].value = u;
    // reset caret position after inserted tabs
    code[0].selectionStart = start+n;
    code[0].selectionEnd = start+n;
}

function autoindent(el) {
    var curpos = el.selectionStart;
    var tabs = 0;
    while (curpos > 0) {
        curpos--;
        if (el.value[curpos] == "\t") {
            tabs++;
        } else if (tabs > 0 || el.value[curpos] == "\n") {
            break;
        }
    }
    setTimeout(function() {
        insertTabs(tabs);
    }, 1);
}

function preventDefault(e) {
    if (e.preventDefault) {
        e.preventDefault();
    } else {
        e.cancelBubble = true;
    }
}

function keyHandler(event) {
    var e = window.event || event;
    if (e.keyCode == 9) { // tab
        insertTabs(1);
        preventDefault(e);
        return false;
    }
    if (e.keyCode == 13) { // enter
        if (e.shiftKey) { // +shift
            compile(e.target);
            preventDefault(e);
            return false;
        } else {
            autoindent(e.target);
        }
    }
    return true;
}

function autocompile() {
    if(!document.getElementById("autocompile").checked) {
        return;
    }
    compile();
}

// TODO(adg): make these functions operate only on a specific code div
function lineHighlight(error) {
    var regex = /(?:compile[0-9]+|prog)\.go:([0-9]+)/g;
    var r = regex.exec(error);
    while (r) {
        $(".lines div").eq(r[1]-1).addClass("lineerror");
          r = regex.exec(error);
    }
}

function lineClear() {
    $(".lineerror").removeClass("lineerror");
}

function compileUpdate() {
    var xh_req = xml_req;
    if(!xh_req || xh_req.readyState != 4) {
        return;
    }
    if(xh_req.status == 200) {
        document.getElementById("output").innerHTML = xh_req.responseText;
        document.getElementById("errors").innerHTML = "";
    } else {
        document.getElementById("errors").innerHTML = xh_req.responseText;
        lineHighlight(document.getElementById("errors").innerText)
        document.getElementById("output").innerHTML = "";
    }
}

(function() {
  "use strict";
  var runFunc;
  var count = 0;

  function getId() {
    return "code" + (count++);
  }

  function text(node) {
    var s = "";
    for (var i = 0; i < node.childNodes.length; i++) {
      var n = node.childNodes[i];
      if (n.nodeType === 1 && n.tagName === "PRE") {
        var innerText = n.innerText === undefined ? "textContent" : "innerText";
        s += n[innerText] + "\n";
        continue;
      }
      if (n.nodeType === 1 && n.tagName !== "BUTTON") {
        s += text(n);
      }
    }
    return s;
  }

  function init(code) {
    var id = getId();

    var output = document.createElement('div');
    var outpre = document.createElement('pre');
    var stopFunc;

    function onKill() {
      if (stopFunc) {
        stopFunc();
      }
    }

    function onRun() {
      onKill();
      outpre.innerHTML = "";
      output.style.display = "block";
      run.style.display = "none";
      stopFunc = runFunc(text(code), outpre);
    }

    function onClose() {
      onKill();
      output.style.display = "none";
      run.style.display = "inline-block";
    }

    var run = document.createElement('button');
    run.innerHTML = 'Run';
    run.className = 'run';
    run.addEventListener("click", onRun, false);
    var run2 = document.createElement('button');
    run2.className = 'run';
    run2.innerHTML = 'Run';
    run2.addEventListener("click", onRun, false);
    var kill = document.createElement('button');
    kill.className = 'kill';
    kill.innerHTML = 'Kill';
    kill.addEventListener("click", onKill, false);
    var close = document.createElement('button');
    close.className = 'close';
    close.innerHTML = 'Close';
    close.addEventListener("click", onClose, false);

    var button = document.createElement('div');
    button.classList.add('buttons');
    button.appendChild(run);
    // Hack to simulate insertAfter
    code.parentNode.insertBefore(button, code.nextSibling);

    var buttons = document.createElement('div');
    buttons.classList.add('buttons');
    buttons.appendChild(run2);
    buttons.appendChild(kill);
    buttons.appendChild(close);

    output.classList.add('output');
    output.appendChild(buttons);
    output.appendChild(outpre);
    output.style.display = "none";
    code.parentNode.insertBefore(output, button.nextSibling);
  }

  var play = document.querySelectorAll('div.playground');
  for (var i = 0; i < play.length; i++) {
    init(play[i]);
  }
  if (play.length > 0) {
    if (window.connectPlayground) {
      runFunc = window.connectPlayground("ws://" + window.location.host + "/socket");
    } else {
      // If this message is logged,
      // we have neglected to include socket.js or playground.js.
      console.log("No playground transport available.");
    }
  }
})

$(document).ready(function() {
    playground({
        'codeEl':     '#code',
        'outputEl':   '#output',
        'runEl':      '#run',
        'fmtEl':      '#fmt',
        'saveEl':     '#save',
        'saveLocEl':  '#saveLoc',
        'enableHistory': true
    });
    $('#code').linedtextarea();
    var about = $('#about');
    about.click(function(e) {
        if ($(e.target).is('a')) {
            return;
        }
        about.hide();
    });
    $('#aboutButton').click(function() {
        if (about.is(':visible')) {
            about.hide();
            return;
        }
        about.show();
    })
    $('#run').click(function() {
        about.hide();
        run();
    })
    $('#save').click(function() {
        about.hide();
        save();
    })
    if (have_file_support()) {
        document.getElementById('load').addEventListener('change', load, false);
        about.hide();
    } else {
        load.hide();
    }
});
