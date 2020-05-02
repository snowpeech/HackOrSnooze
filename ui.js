$(async function () {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navLinks = $(".nav-links");
  const $navSubmit = $("#nav-submit");
  const $favoritedArticles = $("#favorited-articles");
  const $myArticles = $("#my-articles");
  const $navProfile = $("#nav-user-profile");

  // global  variables
  let storyList = null;
  let currentUser = null;

  await checkIfLoggedIn();

  // <-----------Event Handlers Start------------->

  // listener for logging in. Will setup the user instance
  $loginForm.on("submit", async function (evt) {
    evt.preventDefault();

    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  // listener for signing up. Will setup the user instance
  $createAccountForm.on("submit", async function (evt) {
    evt.preventDefault();

    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();
    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  // listener for submitting new story
  $submitForm.on("submit", async function (evt) {
    evt.preventDefault();
    let newStory = {};
    newStory.title = $("#title").val();
    newStory.author = $("#author").val();
    newStory.url = $("#url").val();

    await storyList.addStory(currentUser, newStory);

    await generateStories();

    // submit form hides.
    $submitForm.slideToggle();
    // clear form values.
    $submitForm.trigger("reset");
  });

  // listener for logging out
  $navLogOut.on("click", function () {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  // listener for clicking Log in (UI)
  $navLogin.on("click", function () {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  // listener for clicking Submit in nav (UI)
  $navSubmit.on("click", function () {
    $submitForm.slideToggle();
  });

  // listener for clicking to homepage in nav (UI)
  $("body").on("click", "#nav-all", async function () {
    hideElements();
    await generateStories();

    $allStoriesList.show();
  });

  // listener for clicking on Favorites in nav (UI)
  $("#nav-favorites").on("click", async function () {
    hideElements();
    $favoritedArticles.empty();
    for (let story of currentUser.favorites) {
      const list = generateStoryHTML(story);
      $favoritedArticles.append(list);
    }
    //change stars to fas
    $("#favorited-articles i").toggleClass("far fas");

    $favoritedArticles.show();
  });

  // listener for clicking on My Stories in nav (UI)
  $("#nav-my-stories").on("click", async function () {
    hideElements();
    //favorite stories isn't hiding :(
    $myArticles.empty();
    console.log(currentUser);
    console.log(currentUser.ownStories);
    for (let story of currentUser.ownStories) {
      const list = generateStoryHTML(story);
      $myArticles.append(list);
    }

    //!!change favorited stars to fas
    // get array of favorited.StoryIds?
    let favStoryIdArr = currentUser.favorites.map((story) => story.storyId);
    console.log("FavArr:", favStoryIdArr);
    //get array of ownStories.
    let myStoryIdArr = currentUser.ownStories.map((story) => story.storyId);
    //return duplicates in an array. add to those storyIds
    let stars = returnCommonNums(favStoryIdArr, myStoryIdArr);
    console.log(stars);

    fillStars(stars, "my-articles");

    //prepend garbage icon
    $("#my-articles .star").before(
      '<span class="trash-can"><i class="fas fa-trash-alt"></i></span>'
    );

    $myArticles.show();
  });

  $navProfile.on("click", function () {
    hideElements();
    fillUserProfile();
    $("#user-profile").show();
  });

  // listener for favoriting an article
  //!! need to make sure it only works for loggedIn user
  $(".articles-container").on("click", ".fa-star", async function (e) {
    const i = $(this).parent().parent().index();
    const { storyId } = storyList.stories[i];

    if ($(this).hasClass("far")) {
      await currentUser.addFavorite(storyId);
    } else {
      await currentUser.removeFavorite(storyId);
    }
    $(this).toggleClass("far fas");
  });

  // <-----------Event Listeners End------------->

  /**
   * On page load, checks local storage to see if the user is already logged in. Renders page information accordingly.
   */
  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }
  /**
   * A rendering function to run to reset the forms and hide the login info
   */
  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method, which  generates a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }

    if (currentUser) {
      let favStoryIdArr = currentUser.favorites.map((story) => story.storyId);
      let storyIdArr = storyList.stories.map((story) => story.storyId);
      let stars = returnCommonNums(favStoryIdArr, storyIdArr);

      fillStars(stars, "all-articles-list");
    }
  }

  //  * A function to render HTML for an individual Story instance

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        <span class="star"> 
          <i class = "fa-star far"> </i>
        </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $favoritedArticles,
      $myArticles,
      $("#user-profile"),
      $ownStories,
      $loginForm,
      $createAccountForm,
    ];
    elementsArr.forEach(($elem) => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $navLinks.show();
    $("#nav-welcome").show();
    $navProfile.text(`${currentUser.username}`);
  }

  //fill this in when you click on username
  function fillUserProfile() {
    console.log("cur", currentUser);
    $("#profile-name").append(`<span> ${currentUser.name}</span>`);
    $("#profile-username").append(`<span> ${currentUser.username}</span>`);
    $("#profile-account-date").append(
      `<span> ${currentUser.createdAt.slice(0, 10)}</span>`
    );
  }

  /* simple function to pull the hostname from a URL */
  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */
  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});

function returnCommonNums(arr1, arr2) {
  return arr1.filter((value) => arr2.includes(value));
}

function fillStars(starArr, location) {
  starArr.forEach((star) => {
    $(`#${location} #${star} .fa-star`).toggleClass("far fas");
  });
}
