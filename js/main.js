'use strict';

var app = {
  init: function () {
    /**
     * Configuration de l'app
     * @type {{dir: string, fileextension: string}}
     */
    app.config = {
      dir : 'http://localhost:8000/',
      fileExtensionRegexp : /\.(jpe?g|png|gif)$/,
      paginateApp : true,
      modalTime : 3000
    };

    /**
     * Pagination de l'app
     * @type {{pageSize: number, startIndex: number, currentPage: number}}
     */
    app.pagination = {
      pageSize : 40,
      startIndex : 0,
      currentPage : 1,
      pageSizeOptions : ['20', '40', '60', '100', 'all']
    };

    /**
     * Données de l'app
     * @type {{indexGifs: null, documents: Array}}
     */
    app.data = {
      indexLunr : null,
      documents : []
    };

    /**
     * On charge les gifs au démarrage de l'app
     */
    app.loadGifs();

    /**
     * Pour la copie du lien
     */
    new Clipboard('.btn');
    $('#linkCopied').hide();
  },

  /**
   * Fonction pour charger les gifs lors du démarrage de l'app.
   */
  loadGifs: function () {
    $.ajax({
      url: app.config.dir
    }).done(function(data) {
      $(data).find('a').attr('href', function (i, val) {
        if( val.match(/\.(jpe?g|png|gif)$/) ) {
          var filename = val;
          //console.log(filename);

          var tags = filename.replace(app.config.fileExtensionRegexp, '')
            .replaceAll('_', ' ').replaceAll(/%20/g, ' ');
          app.data.documents.push({
            'name': filename,
            'tags': tags
          });
        }
      })
    })
      .done(function () {
        console.log('Documents : ', app.data.documents);
        app.data.indexLunr = lunr(function () {
          this.ref('name');
          this.field('tags');

          app.data.documents.forEach(function (doc) {
            this.add(doc);
          }, this)
        });
      })
      .done(function () {
        app.setupSearchInput();
      })
      .fail(function (err) {
        $('#container').append(
          '<h1 style="color:red;text-align:center">Connexion impossible</h1>');
        console.log(err);
      })
  },

  /**
   * Fonction pour initialiser le composant de recherche
   */
  setupSearchInput: function () {
    $('#searchinput').on('input', function() {
      if (app.data.indexLunr != null) {
        var gallery = $('.gallery');
        gallery.empty();

        var results;
        var searchTerms = this.value;
        var query = '*';

        if (searchTerms.length == 0 ) {
          results = app.data.indexLunr.search(query);
        } else {
          // On supprime les blancs responsables de recherche générale
          searchTerms = searchTerms.replaceAll(/ +(?= )/g,'').trim();
          searchTerms = searchTerms.split(' ');
          if (searchTerms.length == 1) {
            query = '*' + searchTerms[0] + '*';
          } else {
            query = '*' + searchTerms.join('* *') + '*';
          }

          console.log('Tag recherché : ', query);
          results = app.data.indexLunr.search('tags: ' + query);
          console.log('Résultats Obtenus : ', results);
          console.log('Documents : ', app.data.documents);
        }

        results.sortByKey('ref');

        if (app.config.paginateApp) {
          app.updatePagination(results);
          app.generateGallery(results);
        } else {
          for (var i = 0; i < results.length; i++) {
            var res = results[i];
            app.addGifToGallery(app.config.dir + res.ref);
          }
        }

      }
    }).trigger('input');
  },

  /**
   * Fonction d'update de la pagination
   * @param data
   */
  updatePagination: function (data) {
    app.pagination.currentPage = 0;
    app.pagination.startIndex = 0;
    var pagination = $('.pagination');
    pagination.empty();

    //TODO : Bouton page d'avant
    // $('.pagination').append('<a href="#b">&laquo;</a>');

    /**
     * Construction des liens pour chaque page
     */
    var numberOfPages = Math.ceil(data.length/app.pagination.pageSize);
    pagination.append('<nav><ul class="pagination">');
    for (var i = 1; i <= numberOfPages; i++) {
      pagination.append('<li class="page-item"><a class="page-link page dark" id="p' + i + '" href="#' + i
        + '">' + i + '</a></li>');
    }
    pagination.append('</ul></nav>');

    /**
     * Construction des options sur le nombre de page
     * TODO: S'occuper de l'option du nombre d'éléments maximum par page.
     */
    // pagination.append('<select id="selectPageSizeOption">');
    // var selectPageSizeOption = pagination.find('select');
    // for (var i = 0; i < app.pagination.pageSizeOptions.length; i++) {
    //   selectPageSizeOption.append('<option value="' + i + '">'
    //     + app.pagination.pageSizeOptions[i] + '</option>');
    // }
    // pagination.append('</select>');

    /**
     * Par défaut, on active la première page.
     */
    $('#p1').addClass('active');

    //TODO : Bouton page d'après
    // $('.pagination').append('<a href="#n">&raquo;</a>');

    /**
     * Permet l'action du changement de page en prenant toute action sur un
     * lien dont la classe est 'page'
     */
    $('body').on('click', 'a.page', function (event) {
      //console.log(data);
      app.pagination.currentPage = event.currentTarget.id.replace('p', '');
      //console.log(event);
      $('.pagination').find('a').removeClass('active');
      $(event.currentTarget).addClass('active');
      // $(event).addClass('active');
      app.pagination.startIndex =
        (app.pagination.currentPage-1) * app.pagination.pageSize;
      app.generateGallery(data);
    });

    // TODO : Gérer l'event de changement de selection d'une page.
    // $('#selectPageSizeOption').on('change', function (event) {
    //   app.pagination.pageSize =
    //     app.pagination.pageSizeOptions[event.currentTarget.value];
    //   app.updatePagination(data);
    //   app.generateGallery(data);
    // });

  },

  /**
   * Fonction pour générer les images en fonction de la pagination
   * @param data
   */
  generateGallery: function (data) {
    console.log('startIndex : ', app.pagination.startIndex);
    console.log('currentPage : ', app.pagination.currentPage);
    console.log('pageSize : ', app.pagination.pageSize);
    console.log('data : ', data);

    var pageSize =
      (data.length - app.pagination.startIndex) < app.pagination.pageSize ?
      data.length : app.pagination.pageSize + app.pagination.startIndex;

    $('.gallery').empty();

    for (var i = app.pagination.startIndex; i < pageSize; i++) {
      var res = data[i];
      app.addGifToGallery(app.config.dir + res.ref);
    }
  },

  /**
   * Fonction de formattage d'un lien vers pour une image en html
   * @param link : {string} lien de l'image
   * @returns {string} : code html pour l'image
   */
  formatLinkToImg: function (link) {
    return'<div><button class="btn" onclick="$(\'#linkCopied\').fadeIn({duration: 1000}).fadeOut()" data-clipboard-text="' + link + '"><img class="freezeframe ff-responsive" '
      + 'src="' + link + '"></button></div>';
  },

  showMessageLinkCopied: function (link) {
    $('#')
  },

  /**
   * Fonction d'ajout d'un gif dans la galerie de gifs.
   * @param gif : {string} du gif
   */
  addGifToGallery: function (gif) {
    $('.gallery').append(app.formatLinkToImg(gif));
    $('.freezeframe').freezeframe();
  }

};

/**
 * Fonction générique pour remplacer tous les caractères d'un string,
 * et non plus seulement la première occurrence.
 *
 * @param search : {string} caractère à remplacer
 * @param replacement : {string} caractère de substitution
 * @returns {string} : le string modifié
 */
String.prototype.replaceAll = function(search, replacement) {
  return this.split(search).join(replacement);
};

/**
 * Fonction générique pour trier un tableau en fonction d'une clé en particulier.
 * @param key : {string} clé de tri
 */
Array.prototype.sortByKey = function (key) {
  this.sort(function (a, b) {
    return a[key].localeCompare(b[key]);
  })
};

$(document).ready(app.init);