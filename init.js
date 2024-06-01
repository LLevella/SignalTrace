define([
    'knockout',
    'knockoutmapping',
    'momentwithlocales',
    'core/configd',
		'core/utils',
		'core/draw',
    'text!./template.html',
], function (ko, komapping, momentwithlocales, configd, utils, draw, template) {
    'use strict';

    function About(params) {
        this.$container = params.$container;
        this.isFirstLoad = true;
        this.timer = null;
        this.showPage = ko.observable(true);
        this.alertMessage = utils.addAlertMessage(this.$container);
				this.myCanvas = ko.observable('canvas');
				this.imageWidth = ko.observable('500');
				this.imageHeight = ko.observable('300');
				this.timeStep = 1; // в секундах
				this.timeSum = 0;
				this.x = [];
    }

    About.prototype.template = template;

    About.prototype.alive = function () {
        var $dom = ko.utils.parseHtmlFragment('<div data-bind="visible: showPage()">' + this.template + '</div>')[0];
        this.$container.appendChild($dom);
        try {
            ko.applyBindings({
                data: this.data,
                showPage: this.showPage,
                myCanvas: this.myCanvas,
                imageWidth: this.imageWidth,
                imageHeight: this.imageHeight,
            }, $dom);
        }
        catch(e) {
            console.error(e);
            throw(e);
        }
    };

    About.prototype.load = function () {			
        this.alertMessage('');
        return configd.getMonitoring("/information")
            .next(function (data) {
                data['board-type'] = data['board-type'].replace(/:/g, ' ');

                var uptime = momentwithlocales.duration(data['uptime'].toInt(), "seconds");
                function zeroIfNeed(n) {return n < 10 ? '0' + n: n;}
                data['uptime'] = {
                    key: 'UptimeDHMS',
                    params: {
                        days: uptime.days(),
                        hours: zeroIfNeed(uptime.hours()),
                        minutes: zeroIfNeed(uptime.minutes()),
                        seconds: zeroIfNeed(uptime.seconds())
                    }
                };

                if(this.isFirstLoad) {
                    this.data = komapping.fromJS(data);
                    this.alive();
										this.isFirstLoad = false;
										this.x.push("00:00");
                }
                else {
										komapping.fromJS(data, this.data);
										this.timeSum += this.timeStep;
										let h = Math.floor(this.timeSum/3600);
										let m = Math.floor((this.timeSum - h*3600)/60);
										let s = this.timeSum - h*3600 - m*60;
										// if(h > 0) this.x.push(h+":"+zeroIfNeed(m)+":"+zeroIfNeed(s));
										// else this.x.push(zeroIfNeed(m)+":"+zeroIfNeed(s));
										this.x.push(zeroIfNeed(h)+":"+zeroIfNeed(m)+":"+zeroIfNeed(s));
										if (this.x.length > 30) this.x.shift(); 
                }

								let canvas = draw.create(this.myCanvas, this.imageWidth, this.imageHeight);
								canvas.setFont({color: "#000000"});
								
								let head =  {text: "Это легенда"};
								let lines = [{ text: "rx",color: "green"},
															{text: "tx", color: "blue"}];

								let ydata1 = [0];
								let ydata2 = [0];
								for(let i=0; i< this.x.length; i++)
								{
									ydata1.push(100*Math.random());
									ydata2.push(100*Math.random());
								}
								let y = [{
									data: ydata1,
									legend: lines[0]
								},
								{
									data: ydata2,
									legend: lines[1]
								}
							]
							canvas.init(this.x, y, head);
							canvas.clear();
							canvas.setFont({color: "#000000"});
							canvas.axis("#000000");
							canvas.pointsOnAxis();
							canvas.legend();
							canvas.graph();
				
							this.showPage(true);
            }.bind(this))
            .error(function(e) {
                console.error(e);
                clearInterval(this.timer);
                this.timer = null;
                this.showPage(false);
                this.alertMessage('ErrorCantGetInformation');
                throw '';
            }.bind(this));
    };

    About.prototype.enter = function (params) {
        this.load()
					.next(function () {
					    if(this.timer !== null)
					        clearInterval(this.timer);
					    this.timer = setInterval(this.load.bind(this), this.timeStep * 1000);
					}.bind(this));
    };

    About.prototype.exit = function () {
        if(this.timer !== null)
            clearInterval(this.timer);
        this.timer = null;
    };

    return {
        init: function (params) {
            var module = new About(params);
            return module;
        }
    };
});
