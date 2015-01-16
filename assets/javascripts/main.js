var main = function(WIN, undefined) {
    var w, h;
    //场景宽、高
    var score;
    //分数
    var game;
    //Phaser实例
    var speed = 250;
    var tmp_plus = 0;
    var tmp_minus = 0;
    var lag = 10;
    if (isPc()) {
        //PC端则场景大小为600*800
        w = 600;
        h = 600;
    } else {
        //移动端则取viewport宽高，如果宽大于600则强制宽为600
        if (WIN.innerWidth > 600) {
            w = 600;
        } else {
            w = WIN.innerWidth;
        }
        h = WIN.innerHeight;
    }
    game = new Phaser.Game(w, h, Phaser.AUTO, "main-game");
    //实例化Phaser
    //Loading场景
    var loadState = {
        preload:function() {
            game.stage.backgroundColor = "#000";
            //场景背景色设为#000
            //Loading提示
            loadText = game.add.text(Math.floor(w / 2), Math.floor(h / 2) - h * .04, "载入中...", {
                font:"30px Microsoft Yahei",
                fill:"#fff"
            });
            loadText.anchor.setTo(.5, .5);
            //Loading进度条资源载入
            game.load.image("barwrap", "assets/images/barwrap.png");
            game.load.image("bar", "assets/images/bar.png");
            //蛇、食物资源载入
            game.load.image("snake", "assets/images/snake.png");
            game.load.image("food", "assets/images/food.png");
        },
        create:function() {
            //Loading进度条资源加入场景并居中
            barwrap = game.add.sprite(Math.floor(w / 2), Math.floor(h / 2), "barwrap");
            barwrap.x -= barwrap.width / 2;
            bar = game.add.sprite(Math.floor(w / 2), Math.floor(h / 2) + 4, "bar");
            bar.x -= bar.width / 2;
            //用setPreloadSprite实现读条动画
            game.load.setPreloadSprite(bar);
            //载入完成后转到游戏封面页
            game.state.start("cover");
        }
    };
    //游戏封面场景
    var coverState = {
        preload:function() {
            //动画显示游戏名称
            gameName = game.add.text(Math.floor(w / 2), Math.floor(h / 2) - h * .3, "贪食蛇", {
                font:"30px Microsoft Yahei",
                fill:"#fff"
            });
            gameName.anchor.setTo(.5, .5);
            //设置锚点到gameName的中间（用于场景居中）
            gameName.scale.setTo(0, 0);
            //scale设为0， 相当于缩小到看不见
            game.add.tween(gameName.scale).to({
                //使用Tween动画循环播放，这里的效果是闪动缩放
                x:1,
                y:1
            }, 1e3, Phaser.Easing.Bounce.Out).start();
            //动画显示开始游戏文字提示
            var tipsText;
            if (isPc()) {
                tipsText = "按Enter键开始游戏";
            } else {
                tipsText = "点击屏幕开始游戏";
            }
            startTips = game.add.text(Math.floor(w / 2), Math.floor(h / 2), tipsText, {
                font:"25px Microsoft Yahei",
                fill:"#fff"
            });
            startTips.anchor.setTo(.5, .5);
            game.add.tween(startTips).to({
                alpha:0
            }, 300).to({
                alpha:1
            }, 300).loop().start();
            this.authorText = game.add.text(Math.floor(w / 2), h - 80, "作者：Yanximin", {
                font:"20px Microsoft Yahei",
                fill:"#fff"
            });
            this.authorText.anchor.setTo(.5, .5);
        },
        create:function() {
            //绑定键盘的Enter键
            this.enterKey = this.game.input.keyboard.addKey(Phaser.Keyboard.ENTER);
            //绑定移动端触屏事件，点击屏幕开始游戏，addOnce表明这个事件执行一次后就会销毁
            if (!isPc()) {
                game.input.onDown.addOnce(start, this);
            }
        },
        update:function() {
            //PC端按下Enter键则转到开始游戏场景
            if (this.enterKey.isDown) {
                game.state.start("game");
            }
        }
    };
    //游戏逻辑
    var gameState = {
        create:function() {
            //开启Phaser的Arcade引擎
            game.physics.startSystem(Phaser.Physics.ARCADE);
            //绑定PC端的四个方向键组
            this.cursor = this.game.input.keyboard.createCursorKeys();
            //定义蛇
            this.snake_arr = [];
            //蛇身体存放数组
            this.snake = game.add.group();
            //在场景中加入一个组元素（组里的元素都具备相同的属性）
            this.add_snake(10, 10);
            //开始游戏时将第一个蛇身放在场景的200 ,200处
            //定义食物
            this.food = this.game.add.sprite(100, 100, "food");
            //在场景100, 100处产生第一个食物
            this.food.anchor.setTo(1, 1);
            //食物锚点设置在其右下角
            game.physics.arcade.enable(this.food);
            //开启食物的Arcade引擎
            this.dir = 1;
            //初始移动方向为上（1、上 2、下 3、右 4、左）
            this.is_over = false;
            //蛇的存活状态，true为挂掉，false为存活
            //重置相关记录信息
            score = 0;
            tmp_plus = 0;
            tmp_minus = 0;
            //相当于setInterval，每300毫秒调用一次snake_move移动蛇身
            this.s_move = game.time.events.loop(speed, this.snake_move, this);
            //左下角分数显示
            this.score_mark = game.add.text(50, h - 80, "分数：", {
                font:"20px Microsoft Yahei",
                fill:"#fff"
            });
            this.score_label = game.add.text(110, h - 80, "0", {
                font:"20px Microsoft Yahei",
                fill:"#fff"
            });
            //加减速键定义
            this.plusKey = game.input.keyboard.addKey(107) || game.input.keyboard.addKey(187);
            this.minusKey = game.input.keyboard.addKey(109) || game.input.keyboard.addKey(189);
        },
        update:function() {
            //overlap用于检测snake和food是否重叠，重叠后调用eat
            game.physics.arcade.overlap(this.snake, this.food, this.eat, null, this);
            //检测四个方向按键
            this.movement();
            //检测触屏滑动方向
            this.beginSwipe();
            //循环检测蛇头是否在场景外，在场景外就game over
            if (!this.snake_arr[0].inWorld) this.gameover();
            //this.snake_arr[0].events.onOutOfBounds.add(this.gameover, this);
            //速度控制
            this.speedCtrl(this.s_move.delay);
        },
        //随机函数（用于随机产生食物）
        rand:function(num) {
            return Math.floor(Math.random() * num);
        },
        //添加蛇身方法
        add_snake:function(x, y) {
            var new_snake = this.game.add.sprite(0, 0, "snake");
            new_snake.anchor.setTo(1, 1);
            new_snake.reset(x * 20, y * 20);
            //首个蛇身重置到场景x*20, y*20的位置	
            new_snake.head = false;
            //非蛇头元素
            game.physics.arcade.enable(new_snake);
            //开启新蛇身的Arcade引擎
            this.snake.add(new_snake);
            //将新蛇身加入到组元素中
            this.snake_arr.push(new_snake);
        },
        //游戏结束场景
        gameover:function() {
            if (this.is_over) {
                return;
            }
            this.is_over = true;
            game.state.start("over");
        },
        //蛇移动方法
        snake_move:function() {
            if (this.is_over) {
                return;
            }
            var head = this.snake_arr[0];
            //首个元素为蛇头
            var head_x = this.snake_arr[0].x;
            //蛇头的垂直方向
            var head_y = this.snake_arr[0].y;
            //蛇头的水平方向
            head.head = true;
            //开启蛇头
            head.checkWorldBounds = true;
            //四个方向移动定义
            if (this.dir == 1) {
                head_y -= 20;
            } else if (this.dir == 2) {
                head_y += 20;
            } else if (this.dir == 3) {
                head_x += 20;
            } else if (this.dir == 4) {
                head_x -= 20;
            }
            //循环检测每个蛇身坐标是否与蛇头坐标重合，重合则视为吃掉自己，游戏结束
            this.snake.forEach(function(e) {
                if (!e.head && head.x == e.x && head.y == e.y) this.gameover();
            }, this);
            //将蛇尾变成蛇头，实现蛇的移动
            head.head = false;
            this.curdir = this.dir;
            var tail = this.snake_arr.pop();
            tail.x = head_x;
            tail.y = head_y;
            this.snake_arr.unshift(tail);
        },
        //吃食物方法
        eat:function() {
            var rnd;
            var tag = true;
            //食物是否被吃掉标志，true吃掉则在随机位置重新生成，false则保留在当前位置不重新生成
            while (tag) {
                rnd = {
                    x:this.rand(Math.floor(w * .04)) * 20 + 20,
                    y:this.rand(h * .04) * 20 + 20
                };
                tag = false;
                //判断蛇头是否与食物坐标重合，重合则为吃掉
                if (this.snake_arr[0].x == rnd.x && this.snake_arr[0].y == rnd.y) {
                    tag == true;
                }
            }
            //加分
            score += 1;
            this.score_label.text = score;
            //分段变速
            if (score == 10) {
                this.s_move.delay = this.s_move.delay - lag;
            } else if (score == 15) {
                this.s_move.delay = this.s_move.delay - lag;
            } else if (score == 25) {
                this.s_move.delay = this.s_move.delay - lag;
            } else if (score == 35) {
                this.s_move.delay = this.s_move.delay - lag;
            } else if (score == 70) {
                this.s_move.delay = 80;
            }
            console.log("delay:" + this.s_move.delay);
            this.food.reset(rnd.x, rnd.y);
            //将食物重置到场景随机位置
            this.add_snake(0, 0);
            //吃掉食物后蛇身增加
            //食物产生动画
            this.food.scale.setTo(0, 0);
            this.game.add.tween(this.food.scale).to({
                x:1,
                y:1
            }, 200).start();
        },
        //PC端移动方向控制
        movement:function() {
            if (this.cursor.left.isDown && this.curdir != 3) {
                this.dir = 4;
            } else if (this.cursor.right.isDown && this.curdir != 4) {
                this.dir = 3;
            } else if (this.cursor.up.isDown && this.curdir != 2) {
                this.dir = 1;
            } else if (this.cursor.down.isDown && this.curdir != 1) {
                this.dir = 2;
            }
        },
        //移动端移动方向控制
        beginSwipe:function() {
            var startX;
            var startY;
            var endX;
            var endY;
            var dist = 50;
            //用于定位滑动方位
            //手指接触到屏幕时开始记录所在位置坐标
            game.input.onDown.add(function(pointer) {
                startX = pointer.worldX;
                startY = pointer.worldY;
            }, this);
            //手指滑动后离开屏幕时所在位置坐标记录并判断滑动方向
            game.input.onUp.add(function(pointer) {
                endX = pointer.worldX;
                endY = pointer.worldY;
                if (endX < startX - dist && this.curdir != 3) {
                    this.dir = 4;
                } else if (endX > startX + dist && this.curdir != 4) {
                    this.dir = 3;
                } else if (endY < startY - dist && this.curdir != 2) {
                    this.dir = 1;
                } else if (endY > startY + dist && this.curdir != 1) {
                    this.dir = 2;
                }
            }, this);
        },
        //速度控制
        speedCtrl:function(delay) {
            //加速
            if (this.plusKey.isDown && tmp_plus < lag && this.s_move.delay >= 100) {
                this.s_move.delay -= 1;
                tmp_plus += 1;
                tmp_minus = lag - tmp_plus;
            }
            //减速
            if (this.minusKey.isDown && tmp_minus < lag && this.s_move.delay < 300) {
                this.s_move.delay += 1;
                tmp_minus += 1;
                tmp_plus = lag - tmp_minus;
            }
            console.log("plus:" + tmp_plus + ", minus:" + tmp_minus);
        }
    };
    //游戏结束场景
    var overState = {
        create:function() {
            this.enterKey = this.game.input.keyboard.addKey(Phaser.Keyboard.ENTER);
            overText = game.add.text(Math.floor(w / 2), Math.floor(h / 2) - h * .3, "游戏结束", {
                font:"30px Microsoft Yahei",
                fill:"#fff"
            });
            overText.anchor.setTo(.5, .5);
            overText.scale.setTo(0, 0);
            game.add.tween(overText.scale).to({
                x:1,
                y:1
            }, 1e3, Phaser.Easing.Bounce.Out).start();
            scoreText = game.add.text(Math.floor(w / 2), Math.floor(h / 2) - h * .12, "你的分数为：" + score, {
                font:"20px Microsoft Yahei",
                fill:"#fff"
            });
            scoreText.anchor.setTo(.5, .5);
            var tipsText;
            if (isPc()) {
                tipsText = "按Enter键重新开始游戏";
            } else {
                tipsText = "点击屏幕重新开始游戏";
            }
            startTips = game.add.text(Math.floor(w / 2), Math.floor(h / 2), tipsText, {
                font:"25px Microsoft Yahei",
                fill:"#fff"
            });
            startTips.anchor.setTo(.5, .5);
            game.add.tween(startTips).to({
                alpha:0
            }, 300).to({
                alpha:1
            }, 300).loop().start();
            if (!isPc()) {
                game.input.onDown.addOnce(start, this);
            }
        },
        update:function() {
            if (this.enterKey.isDown) {
                game.state.start("game");
            }
        }
    };
    //游戏开始公用方法
    var start = function() {
        game.state.start("game");
    };
    //所有场景的state加载
    game.state.add("load", loadState);
    game.state.add("cover", coverState);
    game.state.add("game", gameState);
    game.state.add("over", overState);
    //运行load场景
    game.state.start("load");
}(window, undefined);

//forEach在ie下正确作用
if (!Array.prototype.forEach) {
    Array.prototype.forEach = function(callback, thisArg) {
        var T, k;
        if (this == null) {
            throw new TypeError(" this is null or not defined");
        }
        var O = Object(this);
        var len = O.length >>> 0;
        if ({}.toString.call(callback) != "[object Function]") {
            throw new TypeError(callback + " is not a function");
        }
        if (thisArg) {
            T = thisArg;
        }
        k = 0;
        while (k < len) {
            var kValue;
            if (k in O) {
                kValue = O[k];
                callback.call(T, kValue, k, O);
            }
            k++;
        }
    };
}

//移动端检测
function isPc() {
    var userAgentInfo = navigator.userAgent;
    var Agents = new Array("Android", "iPhone", "SymbianOS", "Windows Phone", "iPad", "iPod");
    var flag = true;
    for (var v = 0; v < Agents.length; v++) {
        if (userAgentInfo.indexOf(Agents[v]) > 0) {
            flag = false;
            break;
        }
    }
    return flag;
}

/****** Wechat ******/
var surl = "http://squallyan.github.io";

var imgurl = "assets/images/snake_share.png";

var desc = "经典贪食蛇Phaser版";

function onBridgeReady() {
    WeixinJSBridge.call("showOptionMenu");
    WeixinJSBridge.on("menu:share:appmessage", function(argv) {
        WeixinJSBridge.invoke("sendAppMessage", {
            link:surl,
            img_url:imgurl,
            img_width:"300",
            img_height:"300",
            desc:desc,
            title:desc
        }, function(res) {
            //WeixinJSBridge.log(res.err_msg);
            var msg = res.err_msg;
            if (msg == "send_app_msg:confirm" || msg == "send_app_msg:ok") {
                //已分享
                share_addnum();
            } else {}
        });
    });
    WeixinJSBridge.on("menu:share:timeline", function(argv) {
        WeixinJSBridge.invoke("shareTimeline", {
            link:surl,
            img_url:imgurl,
            img_width:"300",
            img_height:"300",
            desc:desc,
            title:desc
        }, function(e) {
            // alert(e.err_msg);
            //WeixinJSBridge.log(res.err_msg);
            var msg = e.err_msg;
            // alert(msg);
            if (msg == "share_timeline:ok") {
                //已分享
                share_addnum();
            } else {}
        });
    });
}

if (typeof WeixinJSBridge == "undefined") {
    if (document.addEventListener) {
        document.addEventListener("WeixinJSBridgeReady", onBridgeReady, false);
    } else if (document.attachEvent) {
        document.attachEvent("WeixinJSBridgeReady", onBridgeReady);
        document.attachEvent("onWeixinJSBridgeReady", onBridgeReady);
    }
} else {
    onBridgeReady();
}

function share_addnum() {
    alert("分享成功");
}
