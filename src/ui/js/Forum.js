// namespace for this "module"
var Forum = {
  'scrollTarget': undefined,
};

Forum.OPEN_STAR = '&#9734;';
Forum.SOLID_STAR = '&#9733;';

// I believe that a mySQL TEXT column can hold up to 2^16 - 1 bytes of UTF-8
// text, and a UTF-8 character can theoretically be up to four bytes wide (even
// if this is rare in practice), so our post bodies should be guaranteed to be
// able to hold at least (2^16 - 1)/4 characters.
Forum.BODY_MAX_LENGTH = 16383;
Forum.TITLE_MAX_LENGTH = 100;

////////////////////////////////////////////////////////////////////////
// Action flow through this page:
// * Forum.showForumPage() is the landing function. Always call
//   this first. It sets up #forum_page and reads the URL to find out
//   the current board, thread and/or post. Then it calls Forum.showPage()
// * Forum.showPage() calls the API to set either Api.forum_overview,
//   Api.forum_board or Api.forum_thread as appropriate, then passes control
//   to Forum.showOverview(), Forum.showBoard() or Forum.showThread()
// * Forum.showOverview() populates the ... yeah, stuff
//
////////////////////////////////////////////////////////////////////////

Forum.showForumPage = function() {
  // Setup necessary elements for displaying status messages
  Env.setupEnvStub();

  // Make sure the div element that we will need exists in the page body
  if ($('#forum_page').length === 0) {
    $('body').append($('<div>', {'id': 'forum_page', }));
  }

  // wire up an event to catch the back/forward button and call .showPage()

  var boardId = Env.getParameterByName('boardId');
  var threadId = Env.getParameterByName('threadId');
  var postId = Env.getParameterByName('postId');

  // Update the current state + hash in history

  Forum.showPage(boardId, threadId, postId);
};

Forum.showPage = function(boardId, threadId, postId) {
  if (!Login.logged_in) {
    Env.message = {
      'type': 'error',
      'text': 'Can\'t view the forum because you\'re not logged in',
    };
    Forum.layOutPage();
    return;
  }

  // Get all needed information for the current mode, then display the
  // appropriate version of the page
  if (threadId) {
    Api.loadForumThread(threadId, postId, Forum.showThread);
  } else if (boardId) {
    Api.loadForumBoard(boardId, Forum.showBoard);
  } else {
    Api.loadForumOverview(Forum.showOverview);
  }
};

Forum.showOverview = function() {
  Forum.page = $('<div>', { 'class': 'forum' });
  if (!Api.verifyApiData('forum_overview', Forum.layOutPage)) {
    return;
  }

  var table = $('<table>', { 'class': 'boards' });
  Forum.page.append(table);

  var headingTr = $('<tr>');
  table.append(headingTr);
  var headingTd = $('<td>', { 'class': 'heading' });
  headingTr.append(headingTd);

  var breadcrumb = $('<div>', { 'class': 'breadcrumb' });
  headingTd.append(breadcrumb);
  breadcrumb.append($('<span>', {
    'class': 'mainBreadrumb',
    'text': 'Button Men Forums',
  }));

  headingTr.append($('<td>', { 'class': 'notes', 'html': '&nbsp;', }));

  $.each(Api.forum_overview.boards, function(index, board) {
    table.append(Forum.buildBoardRow(board));
  });

  var markReadDiv = $('<div>', { 'class': 'markRead' });
  Forum.page.append(markReadDiv);
  var markReadButton = $('<input>', {
    'type': 'button',
    'value': 'Mark all boards as read',
  });
  markReadDiv.append(markReadButton);
  markReadButton.click(function() {
    Api.markForumRead(Forum.showOverview);
  });

  // Actually lay out the page
  Forum.layOutPage();
};

Forum.showBoard = function() {
  Forum.page = $('<div>', { 'class': 'forum' });
  if (!Api.verifyApiData('forum_board', Forum.layOutPage)) {
    return;
  }

  var table = $('<table>', {
    'class': 'threads ' + Api.forum_board.shortName
  });
  Forum.page.append(table);

  var headingTr = $('<tr>');
  table.append(headingTr);
  var headingTd = $('<td>', { 'class': 'heading' });
  headingTr.append(headingTd);

  var breadcrumb = $('<div>', { 'class': 'breadcrumb' });
  headingTd.append(breadcrumb);
  breadcrumb.append($('<span>', {
    'class': 'pseudoLink',
    'text': 'Forum',
  }));
  breadcrumb.append(': ');
  breadcrumb.append($('<span>', {
    'class': 'mainBreadrumb',
    'text': Api.forum_board.boardName,
  }));
  headingTd.append($('<div>', {
    'class': 'subHeader minor',
    'text': Api.forum_board.description,
  }));

  var newThreadTd = $('<td>', { 'class': 'notes' });
  headingTr.append(newThreadTd);
  var newThreadButton = $('<input>', {
    'id': 'newThreadButton',
    'type': 'button',
    'value': 'New thread',
  });
  newThreadTd.append(newThreadButton);
  newThreadButton.click(Forum.toggleNewThreadForm);

  var newThreadTr = $('<tr>', { 'class': 'writePost' });
  table.append(newThreadTr);
  var contentTd = $('<td>', { 'class': 'body' });
  newThreadTr.append(contentTd);
  contentTd.append($('<input>', {
    'type': 'text',
    'class': 'title',
    'placeholder': 'Thread title...',
    'maxlength': Forum.TITLE_MAX_LENGTH,
  }));
  contentTd.append($('<textarea>', { 'maxlength': Forum.BODY_MAX_LENGTH }));
  var cancelButton = $('<input>', {
    'type': 'button',
    'value': 'Cancel',
  });
  contentTd.append(cancelButton);
  cancelButton.click(Forum.toggleNewThreadForm);
  var replyButton = $('<input>', {
    'type': 'button',
    'value': 'Post new thread',
  });
  contentTd.append(replyButton);
  replyButton.click(Forum.postNewThread);

  //TODO when we support BB code, put instructions for it here
  var notesTd = $('<td>', {
    'class': 'attribution',
    'html': '&nbsp;',
  });
  newThreadTr.append(notesTd);

  if (Api.forum_board.threads.length === 0) {
    var emptyTr = $('<tr>');
    table.append(emptyTr);
    emptyTr.append($('<td>', { 'text': 'No threads', 'class': 'title', }));
    emptyTr.append($('<td>', { 'html': '&nbsp;', 'class': 'notes', }));
  }

  $.each(Api.forum_board.threads, function(index, thread) {
    table.append(Forum.buildThreadRow(thread));
  });

  var markReadDiv = $('<div>', { 'class': 'markRead' });
  Forum.page.append(markReadDiv);
  var markReadButton = $('<input>', {
    'type': 'button',
    'value': 'Mark board as read',
  });
  markReadDiv.append(markReadButton);
  markReadButton.click(function() {
    Api.markForumBoardRead(Forum.showOverview);
  });

  // Actually lay out the page
  Forum.layOutPage();
};

Forum.showThread = function() {
  Forum.page = $('<div>', { 'class': 'forum' });
  if (!Api.verifyApiData('forum_thread', Forum.layOutPage)) {
    return;
  }

  var table = $('<table>', { 'class': 'posts' });
  Forum.page.append(table);

  // Well, this is awkward and ugly, but it *seems* to fix a problem I was
  // having. To wit: using table-layout: fixed; on a table, giving widths to
  // individual cells, but then starting the table with a row containing
  // colspan="2" cell meant that the individual widths of the cells in the
  // other rows were ignored. So instead, we'll start the table with a dummy
  // empty row with properly-widthed cells that will hopefully be invisible to
  // everyone.
  var dummyTr = $('<tr>');
  table.append(dummyTr);
  dummyTr.append($('<td>', { 'class': 'attribution' }));
  dummyTr.append($('<td>', { 'class': 'body' }));

  var headingTd = $('<td>', {
    'class': 'heading',
    'colspan': 2,
  });
  table.append(
    $('<tr>', { 'class': Api.forum_thread.boardShortName }).append(headingTd)
  );

  var breadcrumb = $('<div>', { 'class': 'breadcrumb' });
  headingTd.append(breadcrumb);
  breadcrumb.append($('<div>', {
    'class': 'mainBreadrumb',
    'text': Api.forum_thread.threadTitle,
  }));


  var subHeader = $('<div>', { 'class': 'subHeader' });
  headingTd.append(subHeader);
  subHeader.append($('<span>', {
    'class': 'pseudoLink',
    'text': 'Forum',
  }));
  subHeader.append(': ');
  subHeader.append($('<span>', {
    'class': 'pseudoLink',
    'text': Api.forum_thread.boardName,
    'data-boardId': Api.forum_thread.boardId,
  }));

  $.each(Api.forum_thread.posts, function(index, post) {
    table.append(Forum.buildPostRow(post));
  });

  var replyTr = $('<tr>', { 'class': 'writePost' });
  table.append(replyTr);
  //TODO when we support BB code, put instructions for it here
  replyTr.append($('<td>', {
    'class': 'attribution',
    'html': '&nbsp;',
  }));
  var replyBodyTd = $('<td>', { 'class': 'body' });
  replyTr.append(replyBodyTd);
  replyBodyTd.append($('<textarea>', {
    'placeholder': 'Reply to thread...',
    'maxlength': Forum.BODY_MAX_LENGTH,
  }));
  var replyButton = $('<input>', {
    'type': 'button',
    'value': 'Post reply',
    'maxlength': Forum.BODY_MAX_LENGTH,
  });
  replyBodyTd.append(replyButton);
  replyButton.click(Forum.replyToThread);

  var markReadDiv = $('<div>', { 'class': 'markRead' });
  Forum.page.append(markReadDiv);
  var markReadButton = $('<input>', {
    'type': 'button',
    'value': 'Mark thread as read',
  });
  markReadDiv.append(markReadButton);
  markReadButton.click(function() {
    Api.markForumThreadRead(Forum.showBoard);
  });

  // Actually lay out the page
  Forum.layOutPage();
};

Forum.layOutPage = function() {
  // If there is a message from a current or previous invocation of this
  // page, display it now
  Env.showStatusMessage();

  Forum.page.find('.pseudoLink').click(Forum.linkToSubPage);

  $('#forum_page').empty();
  $('#forum_page').append(Forum.page);

  Forum.scrollTo(Forum.scrollTarget);
};

Forum.scrollTo = function(scrollTarget) {
  var scrollTop = 0;
  if (scrollTarget) {
    scrollTarget = $(scrollTarget);
    scrollTop = scrollTarget.offset().top - 5;
  }
  $('html, body').animate({ scrollTop: scrollTop }, 200);
};

Forum.linkToSubPage = function() {
  var boardId = $(this).attr('data-boardId');
  var threadId = $(this).attr('data-threadId');
  var postId = $(this).attr('data-postId');

  //TODO push the new state + hash into history

  Forum.showPage(boardId, threadId, postId);
};

Forum.buildPostRow = function(post) {
  var tr = $('<tr>');
  if (post.postId == Api.forum_thread.currentPostId) {
    Forum.scrollTarget = tr;
  }

  var attributionTd = $('<td>', { 'class': 'attribution' });
  tr.append(attributionTd);

  var nameDiv = $('<div>', {
    'class': 'name',
  });
  attributionTd.append(nameDiv);
  var anchorSymbol =
    ((post.postId == Api.forum_thread.currentPostId) ?
      Forum.SOLID_STAR :
      Forum.OPEN_STAR);
  var postAnchor = $('<span>', {
    'class': 'postAnchor',
    'href':
      'forum.html#!threadId=' + Api.forum_thread.threadId +
        '&postId=' + post.postId,
    'html': anchorSymbol,
  })
  nameDiv.append(postAnchor);
  nameDiv.append(post.posterName);

  postAnchor.click(function() {
    //TODO set the hashbang!
    $('.postAnchor').html(Forum.OPEN_STAR);
    $(this).html(Forum.SOLID_STAR);
    Forum.scrollTo($(this).closest('tr'));
  });

  attributionTd.append($('<div>', {
    'class': 'minor',
    'text': 'Posted: ' + Env.formatTimestamp(post.creationTime, 'datetime'),
  }));
  if (post.lastUpdateTime != post.creationTime) {
    attributionTd.append($('<div>', {
      'class': 'minor',
      'text': 'Edited: ' + Env.formatTimestamp(post.lastUpdateTime, 'datetime'),
    }));
  }

  if (post.isNew) {
    attributionTd.append($('<div>', {
      'class': 'new',
      'text': '*NEW*',
    }));
  }

  var bodyTd = $('<td>', { 'class': 'body' });
  tr.append(bodyTd);
  // Env.prepareRawTextForDisplay() converts the dangerous raw text
  // into safe HTML.
  bodyTd.append(Env.prepareRawTextForDisplay(post.body));
  if (post.deleted) {
    bodyTd.addClass('deleted');
  }

  return tr;
};

Forum.replyToThread = function() {
  var body = $(this).parent().find('textarea').val().trim();
  if (!body) {
    Env.message = {
      'type': 'error',
      'text': 'The post body is required',
    };
    Env.showStatusMessage();
    return;
  }
  Api.createForumPost(body, Forum.showThread);
};

Forum.postNewThread = function() {
  var title = $(this).parent().find('input.title').val().trim();
  var body = $(this).parent().find('textarea').val().trim();
  if (!title || !body) {
    Env.message = {
      'type': 'error',
      'text': 'The thread title and body are both required',
    };
    Env.showStatusMessage();
    return;
  }
  Api.createForumThread(title, body, Forum.showThread);
};

Forum.buildThreadRow = function(thread) {
  var tr = $('<tr>', { 'class': 'thread' });

  var titleTd = $('<td>', { 'class': 'title' });
  tr.append(titleTd);

  titleTd.append($('<div>', {
    'class': 'pseudoLink',
    'text': thread.threadTitle,
    'data-threadId': thread.threadId,
  }));

  var postDates =
    'Originally by ' + thread.originalPosterName + ' at ' +
      Env.formatTimestamp(thread.originalCreationTime) + '.';
  if (thread.latestLastUpdateTime != thread.originalCreationTime) {
    postDates += ' Updated by ' + thread.latestPosterName + ' at ' +
      Env.formatTimestamp(thread.latestLastUpdateTime) + '.';
  }
  titleTd.append($('<div>', {
    'class': 'minor',
    'text': postDates,
  }));

  var notesTd = $('<td>', { 'class': 'notes' });
  tr.append(notesTd);
  var numberOfPosts =
    thread.numberOfPosts + ' post' + (thread.numberOfPosts != 1 ? 's ' : ' ');
  notesTd.append($('<div>', {
    'class': 'minor',
    'text': numberOfPosts,
  }));
  if (thread.firstNewPostId) {
    notesTd.append($('<div>', {
      'class': 'pseudoLink new',
      'text': '*NEW*',
      'data-threadId': thread.threadId,
      'data-postId': thread.firstNewPostId,
    }));
  }

  return tr;
};

Forum.toggleNewThreadForm = function() {
  // Using visibility rather than display: hidden so we don't reflow the table
  if ($('#newThreadButton').css('visibility') == 'visible') {
    $('#newThreadButton').css('visibility', 'hidden');
    $('tr.writePost textarea').val('');
    $('tr.writePost input.title').val('');
    $('tr.thread').hide();
    $('tr.writePost').show();
    $('tr.writePost input.title').focus();
  } else {
    $('tr.writePost').hide();
    $('tr.thread').show();
    $('#newThreadButton').css('visibility', 'visible');
  }
};

Forum.buildBoardRow = function(board) {
  var tr = $('<tr>', { 'class': board.shortName });

  var titleTd = $('<td>', { 'class': 'title' });
  tr.append(titleTd);

  titleTd.append($('<div>', {
    'class': 'pseudoLink',
    'text': board.boardName,
    'data-boardId': board.boardId,
  }));

  titleTd.append($('<div>', {
    'class': 'minor',
    'text': board.description,
  }));

  var notesTd = $('<td>', { 'class': 'notes' });
  tr.append(notesTd);
  var numberOfThreads = board.numberOfThreads + ' thread' +
    (board.numberOfThreads != 1 ? 's ' : ' ');
  notesTd.append($('<div>', {
    'class': 'minor',
    'text': numberOfThreads,
  }));
  if (board.firstNewPostId) {
    notesTd.append($('<div>', {
      'class': 'pseudoLink new',
      'text': '*NEW*',
      'data-threadId': board.firstNewPostThreadId,
      'data-postId': board.firstNewPostId,
    }));
  }

  return tr;
};

