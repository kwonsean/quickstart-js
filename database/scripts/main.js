/**
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

/*
 * firebase.database().ref()를 통해 DB에 접근할 수 있다.
 * 이때 ref 메소드에 인자로 경로를 넣어주면 그 경로에 있는 데이터에 접근 가능하다. (아무것도 안넣으면 DB의 root 조회)
 * set을 이용하여 데이터를 쓰고, on을 이용하여 데이터를 읽음
 * on의 첫번째 인수로는 이벤트 타입을 입력해야 함 (value, child_added, child_removed, child_chaged, child_moved)
 * 두번째 인수로는 아무 변수명을 이용해도 되고 이 변수를 통해서 데이터에 접근하는 것으로 파악
 * 코드를 작성한 순서대로 출력이 안됨. => 아마도 비동기로 처리되는것 같음 빨리 데이터 가져온 것 부터?
 * 왜냐하면 밑에 posts 내용을 조회하는 코드가 밑에 있음에도 더 빨리 출력된다. (위 코드에 비해 가져오는 데이터양이 적음)
 */
const rootDbRef = firebase.database().ref();
console.log(rootDbRef);
rootDbRef.on('value', value => {
  const data = value.val();
  console.log(data, value);
});

const dbRef = firebase.database().ref('posts');
dbRef.on('value', snapshot => {
  const data = snapshot.val();
  console.log(data, snapshot);
});

// Shortcuts to DOM Elements.
var messageForm = document.getElementById('message-form');
var messageInput = document.getElementById('new-post-message');
var titleInput = document.getElementById('new-post-title');
var signInButton = document.getElementById('sign-in-button');
var signOutButton = document.getElementById('sign-out-button');
var splashPage = document.getElementById('page-splash');
var addPost = document.getElementById('add-post');
var addButton = document.getElementById('add');
var recentPostsSection = document.getElementById('recent-posts-list');
var userPostsSection = document.getElementById('user-posts-list');
var topUserPostsSection = document.getElementById('top-user-posts-list');
var recentMenuButton = document.getElementById('menu-recent');
var myPostsMenuButton = document.getElementById('menu-my-posts');
var myTopPostsMenuButton = document.getElementById('menu-my-top-posts');
var listeningFirebaseRefs = [];

/**
 * Saves a new post to the Firebase DB.
 */
function writeNewPost(uid, username, picture, title, body) {
  // A post entry.
  var postData = {
    author: username,
    uid: uid,
    body: body,
    title: title,
    starCount: 0,
    authorPic: picture,
  };
  console.log(postData);
  // Get a key for a new Post.
  var newPostKey = firebase.database().ref().child('posts').push().key;
  // console.log(firebase.database().ref().child('posts').push());
  // console.log(newPostKey);
  // Write the new post's data simultaneously in the posts list and the user's post list.
  var updates = {};
  updates['/posts/' + newPostKey] = postData;
  updates['/user-posts/' + uid + '/' + newPostKey] = postData;
  console.log(updates);
  // * 키 값이 경로가 되고 벨류 값이 저장되는 내용
  return firebase.database().ref().update(updates);
}

/**
 * Star/unstar post.
 */
// * 함수가 2번 호출됨 => posts DB 와 user-posts DB에 모두 반영하기 위해
function toggleStar(postRef, uid) {
  // console.log(postRef.transaction, uid);
  postRef.transaction(function (post) {
    // * 글 정보 =>  stars값이 있고 stars의 uid가 있으면 (지금 누른 사람이 또 누른거면) 카운트 줄이고 없앰
    // * null 값 넣으면 DB에서 없어짐
    // console.log(post);
    if (post) {
      if (post.stars && post.stars[uid]) {
        post.starCount--;
        post.stars[uid] = null;
      } else {
        post.starCount++;
        // * stars 키가 없으면 빈 객체로 생성하고 유저 정보 추가
        if (!post.stars) {
          post.stars = {};
        }
        post.stars[uid] = true;
      }
    }
    return post;
  });
}

/**
 * Creates a post element.
 */
function createPostElement(postId, title, text, author, authorId, authorPic) {
  // * 현재 유저의 uid 가져오는 방법
  var uid = firebase.auth().currentUser.uid;

  var html =
    '<div class="post post-' +
    postId +
    ' mdl-cell mdl-cell--12-col ' +
    'mdl-cell--6-col-tablet mdl-cell--4-col-desktop mdl-grid mdl-grid--no-spacing">' +
    '<div class="mdl-card mdl-shadow--2dp">' +
    '<div class="mdl-card__title mdl-color--light-blue-600 mdl-color-text--white">' +
    '<h4 class="mdl-card__title-text"></h4>' +
    '</div>' +
    '<div class="header">' +
    '<div>' +
    '<div class="avatar"></div>' +
    '<div class="username mdl-color-text--black"></div>' +
    '</div>' +
    '</div>' +
    '<span class="star">' +
    '<div class="not-starred material-icons">star_border</div>' +
    '<div class="starred material-icons">star</div>' +
    '<div class="star-count">0</div>' +
    '</span>' +
    '<div class="text"></div>' +
    '<div class="comments-container"></div>' +
    '<form class="add-comment" action="#">' +
    '<div class="mdl-textfield mdl-js-textfield">' +
    '<input class="mdl-textfield__input new-comment" type="text">' +
    '<label class="mdl-textfield__label">Comment...</label>' +
    '</div>' +
    '</form>' +
    '</div>' +
    '</div>';

  // Create the DOM element from the HTML.
  var div = document.createElement('div');
  div.innerHTML = html;
  var postElement = div.firstChild;
  // * 이건 또 왜 3번 출력되냐
  // console.log('postEl', postElement);
  // * componentHandler 파악 못함 (여러 함수로 구성된 객체, 이미 global로 있음)
  // console.log(componentHandler);
  if (componentHandler) {
    componentHandler.upgradeElements(
      postElement.getElementsByClassName('mdl-textfield')[0]
    );
  }

  var addCommentForm = postElement.getElementsByClassName('add-comment')[0];
  var commentInput = postElement.getElementsByClassName('new-comment')[0];
  var star = postElement.getElementsByClassName('starred')[0];
  var unStar = postElement.getElementsByClassName('not-starred')[0];

  // Set values.
  postElement.getElementsByClassName('text')[0].innerText = text;
  postElement.getElementsByClassName('mdl-card__title-text')[0].innerText =
    title;
  postElement.getElementsByClassName('username')[0].innerText =
    author || 'Anonymous';
  postElement.getElementsByClassName('avatar')[0].style.backgroundImage =
    'url("' + (authorPic || './silhouette.jpg') + '")';

  // Listen for comments.
  var commentsRef = firebase.database().ref('post-comments/' + postId);
  commentsRef.on('child_added', function (data) {
    // * 댓글에 대한 정보가 들어있음 (post-comments/postId DB에 접근)
    // console.log(data);
    addCommentElement(
      postElement,
      data.key,
      data.val().text,
      data.val().author
    );
  });

  commentsRef.on('child_changed', function (data) {
    setCommentValues(postElement, data.key, data.val().text, data.val().author);
  });

  commentsRef.on('child_removed', function (data) {
    deleteComment(postElement, data.key);
  });

  // Listen for likes counts.
  var starCountRef = firebase.database().ref('posts/' + postId + '/starCount');
  starCountRef.on('value', function (snapshot) {
    updateStarCount(postElement, snapshot.val());
  });

  // Listen for the starred status.
  // * 현재 로그인한 계정의 id로 DB를 검색해서 star를 준 사람 목록에 있는지 없는지 파악
  // * updateStarredByCurrentUser를 이용하여 true/false값을 기준으로 화면에 보여지는 star디자인 변경
  var starredStatusRef = firebase
    .database()
    .ref('posts/' + postId + '/stars/' + uid);
  starredStatusRef.on('value', function (snapshot) {
    // console.log(snapshot.val());
    updateStarredByCurrentUser(postElement, snapshot.val());
  });

  // Keep track of all Firebase reference on which we are listening.
  listeningFirebaseRefs.push(commentsRef);
  listeningFirebaseRefs.push(starCountRef);
  listeningFirebaseRefs.push(starredStatusRef);

  // Create new comment.
  addCommentForm.onsubmit = function (e) {
    e.preventDefault();
    createNewComment(
      postId,
      firebase.auth().currentUser.displayName,
      uid,
      commentInput.value
    );
    commentInput.value = '';
    commentInput.parentElement.MaterialTextfield.boundUpdateClassesHandler();
  };

  // Bind starring action.
  // *
  var onStarClicked = function () {
    var globalPostRef = firebase.database().ref('/posts/' + postId);
    var userPostRef = firebase
      .database()
      .ref('/user-posts/' + authorId + '/' + postId);
    toggleStar(globalPostRef, uid);
    toggleStar(userPostRef, uid);
  };
  // * 별 요소가 클릭되면 위 함수 실행됨
  unStar.onclick = onStarClicked;
  star.onclick = onStarClicked;

  return postElement;
}

/**
 * Writes a new comment for the given post.
 */
function createNewComment(postId, username, uid, text) {
  firebase
    .database()
    .ref('post-comments/' + postId)
    .push({
      text: text,
      author: username,
      uid: uid,
    });
}

/**
 * Updates the starred status of the post.
 */
// * 유저의 star체크 여부에 따라 글 상자에 보여지는 별 디자인 반영
function updateStarredByCurrentUser(postElement, starred) {
  if (starred) {
    postElement.getElementsByClassName('starred')[0].style.display =
      'inline-block';
    postElement.getElementsByClassName('not-starred')[0].style.display = 'none';
  } else {
    postElement.getElementsByClassName('starred')[0].style.display = 'none';
    postElement.getElementsByClassName('not-starred')[0].style.display =
      'inline-block';
  }
}

/**
 * Updates the number of stars displayed for a post.
 */
// * star 카운트값 업데이트
function updateStarCount(postElement, nbStart) {
  postElement.getElementsByClassName('star-count')[0].innerText = nbStart;
}

/**
 * Creates a comment element and adds it to the given postElement.
 */
// * 이미 글 상자를 만들때 비어있는 comment-container요소가 있고 여기다가 새롭게 만든 요소를 추가함
// * 자꾸 [0]이 붙는건 여러개 있어서가 아닌 클래스로 요소를 생성하고 불러오기 때문에
// * postElemet는 미리 만들어둔 글상자 요소
function addCommentElement(postElement, id, text, author) {
  var comment = document.createElement('div');
  comment.classList.add('comment-' + id);
  comment.innerHTML =
    '<span class="username"></span><span class="comment"></span>';
  comment.getElementsByClassName('comment')[0].innerText = text;
  comment.getElementsByClassName('username')[0].innerText =
    author || 'Anonymous';

  var commentsContainer =
    postElement.getElementsByClassName('comments-container')[0];
  commentsContainer.appendChild(comment);
}

// ! 여기서 postElement는 다 글 상자 div
/**
 * Sets the comment's values in the given postElement.
 */
function setCommentValues(postElement, id, text, author) {
  // * DB 직접 수정했더니만 작동함
  // console.log('change!', postElement);
  var comment = postElement.getElementsByClassName('comment-' + id)[0];
  comment.getElementsByClassName('comment')[0].innerText = text;
  comment.getElementsByClassName('fp-username')[0].innerText = author;
}

/**
 * Deletes the comment of the given ID in the given postElement.
 */
function deleteComment(postElement, id) {
  // * DB 직접 삭제해도 작동함
  console.log('DELETE', postElement);
  var comment = postElement.getElementsByClassName('comment-' + id)[0];
  comment.parentElement.removeChild(comment);
}

/**
 * Starts listening for new posts and populates posts lists.
 */
function startDatabaseQueries() {
  var myUserId = firebase.auth().currentUser.uid;
  // * 가져오는 래퍼런스들이 다 다름 (조건이 있음)
  var topUserPostsRef = firebase
    .database()
    .ref('user-posts/' + myUserId)
    .orderByChild('starCount');
  var recentPostsRef = firebase.database().ref('posts').limitToLast(100);
  var userPostsRef = firebase.database().ref('user-posts/' + myUserId);

  var fetchPosts = function (postsRef, sectionElement) {
    postsRef.on('child_added', function (data) {
      // console.log(data.val());
      var author = data.val().author || 'Anonymous';
      var containerElement =
        sectionElement.getElementsByClassName('posts-container')[0];
      containerElement.insertBefore(
        createPostElement(
          data.key,
          data.val().title,
          data.val().body,
          author,
          data.val().uid,
          data.val().authorPic
        ),
        containerElement.firstChild
      );
    });
    postsRef.on('child_changed', function (data) {
      var containerElement =
        sectionElement.getElementsByClassName('posts-container')[0];
      var postElement = containerElement.getElementsByClassName(
        'post-' + data.key
      )[0];
      postElement.getElementsByClassName('mdl-card__title-text')[0].innerText =
        data.val().title;
      postElement.getElementsByClassName('username')[0].innerText =
        data.val().author;
      postElement.getElementsByClassName('text')[0].innerText = data.val().body;
      postElement.getElementsByClassName('star-count')[0].innerText =
        data.val().starCount;
    });
    postsRef.on('child_removed', function (data) {
      var containerElement =
        sectionElement.getElementsByClassName('posts-container')[0];
      var post = containerElement.getElementsByClassName('post-' + data.key)[0];
      post.parentElement.removeChild(post);
    });
  };

  // Fetching and displaying all posts of each sections.
  fetchPosts(topUserPostsRef, topUserPostsSection);
  fetchPosts(recentPostsRef, recentPostsSection);
  fetchPosts(userPostsRef, userPostsSection);

  // Keep track of all Firebase refs we are listening to.
  listeningFirebaseRefs.push(topUserPostsRef);
  listeningFirebaseRefs.push(recentPostsRef);
  listeningFirebaseRefs.push(userPostsRef);
}

/**
 * Writes the user's data to the database.
 */
function writeUserData(userId, name, email, imageUrl) {
  firebase
    .database()
    .ref('users/' + userId)
    .set({
      username: name,
      email: email,
      profile_picture: imageUrl,
    });
}

/**
 * Cleanups the UI and removes all Firebase listeners.
 */
function cleanupUi() {
  // Remove all previously displayed posts.
  topUserPostsSection.getElementsByClassName('posts-container')[0].innerHTML =
    '';
  recentPostsSection.getElementsByClassName('posts-container')[0].innerHTML =
    '';
  userPostsSection.getElementsByClassName('posts-container')[0].innerHTML = '';

  // Stop all currently listening Firebase listeners.
  listeningFirebaseRefs.forEach(function (ref) {
    ref.off();
  });
  listeningFirebaseRefs = [];
}

/**
 * The ID of the currently signed-in User. We keep track of this to detect Auth state change events that are just
 * programmatic token refresh but not a User status change.
 */
var currentUID;

/**
 * Triggers every time there is a change in the Firebase auth state (i.e. user signed-in or user signed out).
 */
function onAuthStateChanged(user) {
  // We ignore token refresh events.
  if (user && currentUID === user.uid) {
    return;
  }

  cleanupUi();
  if (user) {
    currentUID = user.uid;
    splashPage.style.display = 'none';
    writeUserData(user.uid, user.displayName, user.email, user.photoURL);
    startDatabaseQueries();
  } else {
    // Set currentUID to null.
    currentUID = null;
    // Display the splash page where you can sign-in.
    splashPage.style.display = '';
  }
}

/**
 * Creates a new post for the current user.
 */
function newPostForCurrentUser(title, text) {
  var userId = firebase.auth().currentUser.uid;
  return firebase
    .database()
    .ref('/users/' + userId)
    .once('value')
    .then(function (snapshot) {
      var username = (snapshot.val() && snapshot.val().username) || 'Anonymous';
      return writeNewPost(
        firebase.auth().currentUser.uid,
        username,
        firebase.auth().currentUser.photoURL,
        title,
        text
      );
    });
}

/**
 * Displays the given section element and changes styling of the given button.
 */
// * 선택한 section 보여주기, 활성화 디자인 변경
function showSection(sectionElement, buttonElement) {
  recentPostsSection.style.display = 'none';
  userPostsSection.style.display = 'none';
  topUserPostsSection.style.display = 'none';
  addPost.style.display = 'none';
  recentMenuButton.classList.remove('is-active');
  myPostsMenuButton.classList.remove('is-active');
  myTopPostsMenuButton.classList.remove('is-active');

  if (sectionElement) {
    sectionElement.style.display = 'block';
  }
  if (buttonElement) {
    buttonElement.classList.add('is-active');
  }
}

// Bindings on load.
window.addEventListener(
  'load',
  function () {
    // Bind Sign in button.
    signInButton.addEventListener('click', function () {
      var provider = new firebase.auth.GoogleAuthProvider();
      console.log('provider!!!', provider);
      firebase.auth().signInWithPopup(provider);
    });

    // Bind Sign out button.
    signOutButton.addEventListener('click', function () {
      firebase.auth().signOut();
    });

    // Listen for auth state changes
    firebase.auth().onAuthStateChanged(onAuthStateChanged);

    // Saves message on form submit.
    messageForm.onsubmit = function (e) {
      e.preventDefault();
      var text = messageInput.value;
      var title = titleInput.value;
      if (text && title) {
        newPostForCurrentUser(title, text).then(function () {
          myPostsMenuButton.click();
        });
        messageInput.value = '';
        titleInput.value = '';
      }
    };

    // Bind menu buttons.
    recentMenuButton.onclick = function () {
      showSection(recentPostsSection, recentMenuButton);
    };
    myPostsMenuButton.onclick = function () {
      showSection(userPostsSection, myPostsMenuButton);
    };
    myTopPostsMenuButton.onclick = function () {
      showSection(topUserPostsSection, myTopPostsMenuButton);
    };
    addButton.onclick = function () {
      showSection(addPost);
      messageInput.value = '';
      titleInput.value = '';
    };
    recentMenuButton.onclick();
  },
  false
);
