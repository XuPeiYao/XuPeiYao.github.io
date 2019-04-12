/**
 * some JavaScript code for this blog theme
 */
/* jshint asi:true */

/////////////////////////header////////////////////////////
/**
 * clickMenu
 */
(function() {
  if (window.innerWidth <= 770) {
    var menuBtn = document.querySelector('#headerMenu');
    var nav = document.querySelector('#headerNav');
    menuBtn.onclick = function(e) {
      e.stopPropagation();
      if (menuBtn.classList.contains('active')) {
        menuBtn.classList.remove('active');
        nav.classList.remove('nav-show');
      } else {
        nav.classList.add('nav-show');
        menuBtn.classList.add('active');
      }
    };
    document.querySelector('body').addEventListener('click', function() {
      nav.classList.remove('nav-show');
      menuBtn.classList.remove('active');
    });
  }
})();

//////////////////////////back to top////////////////////////////
(function() {
  var backToTop = document.querySelector('.back-to-top');
  var backToTopA = document.querySelector('.back-to-top a');
  // console.log(backToTop);
  window.addEventListener('scroll', function() {
    // 页面顶部滚进去的距离
    var scrollTop = Math.max(
      document.documentElement.scrollTop,
      document.body.scrollTop
    );

    if (scrollTop > 200) {
      backToTop.classList.add('back-to-top-show');
    } else {
      backToTop.classList.remove('back-to-top-show');
    }
  });

  // backToTopA.addEventListener('click',function (e) {
  //     e.preventDefault()
  //     window.scrollTo(0,0)
  // })
})();

//////////////////////////hover on demo//////////////////////////////
(function() {
  var demoItems = document.querySelectorAll('.grid-item');
})();

(function(d) {
  var config = {
      kitId: 'cky5obu',
      scriptTimeout: 3000,
      async: true
    },
    h = d.documentElement,
    t = setTimeout(function() {
      h.className = h.className.replace(/\bwf-loading\b/g, '') + ' wf-inactive';
    }, config.scriptTimeout),
    tk = d.createElement('script'),
    f = false,
    s = d.getElementsByTagName('script')[0],
    a;
  h.className += ' wf-loading';
  tk.src = 'https://use.typekit.net/' + config.kitId + '.js';
  tk.async = true;
  tk.onload = tk.onreadystatechange = function() {
    a = this.readyState;
    if (f || (a && a != 'complete' && a != 'loaded')) return;
    f = true;
    clearTimeout(t);
    try {
      Typekit.load(config);
    } catch (e) {}
  };
  s.parentNode.insertBefore(tk, s);
})(document);
