(function () {
    'use strict';

    var app = angular.module('app');

    // Collect the routes
    app.constant('routes', getRoutes());
    
    // Configure the routes and route resolvers
    app.config(['$routeProvider', 'routes', routeConfigurator]);
    function routeConfigurator($routeProvider, routes) {

        routes.forEach(function (r) {
            $routeProvider.when(r.url, r.config);
        });
        $routeProvider.otherwise({ redirectTo: '/' });
    }

    // Define the routes 
    function getRoutes() {
        return [
            {
                url: '/ice-age',
                config: {
                    templateUrl: 'app/ice-age/start.html',
                    title: 'ice-age',
                    settings: {
                        nav: 1,
                        content: '<i class="fa fa-dashboard"></i> Ice Age'
                    }
                }
            }, {
                url: '/poohsticks',
                config: {
                    templateUrl: 'app/pooh-sticks/start.html',
                    title: 'pooh-sticks',
                    settings: {
                        nav: 2,
                        content: '<i class="fa fa-lock"></i> Pooh Sticks'
                    }
                }
            }
        ];
    }
})();