var currentPMUser="";

function initWS() {
    var ws = new WebSocket("ws://ws.juick.com/?hash="+hash);
    ws.onopen = function(){  
        $('#sidepanel').addClass('online');
    };
    ws.onclose = function(){  
        $('#sidepanel').removeClass('online');
    };
    ws.onmessage = function(msg){  
        if(msg.data==' ') {
            ws.send(' ');
        } else {
            try {
                var jsonMsg=$.parseJSON(msg.data);
                if(jsonMsg.rid>0) {
                    incomingComment(jsonMsg);
                } else if(jsonMsg.mid>0) {
                    incomingPost(jsonMsg);
                } else {
                    incomingPM(jsonMsg);
                }
            } catch(err) {
                console.log(err);
            }
        }
    };
}

function incomingPM(msg) {
    try {
        if(msg.user.uname===currentPMUser) {
            $('#pmlist').append($("<li/>").attr("class","pm-in").text(msg.body));
            $(window).scrollTop($(document).height());
        } else {
            var modified=false;
            $.each(lastConversations,function(i,item) {
                if(item.uname===msg.user.uname) {
                    if(item.MessagesCount>0) {
                        item.MessagesCount++;
                    } else {
                        item.MessagesCount=1;
                    }
                    modified=true;
                }
            });
            if(!modified) {
                lastConversations.unshift({
                    uname:msg.user.uname,
                    uid:msg.user.uid,
                    MessagesCount:"1"
                });
            }
            initPMUList();
        }
    } catch(err) { }
}

function incomingPost(msg) {
    console.log(msg);
}

function incomingComment(msg) {
    console.log(msg);
}

function initPMUList() {
    var ul=$('#pmulist');
    ul.empty();
    $.each(lastConversations,function(i,item) {
        var img=$("<img/>").attr("src","http://i.juick.com/as/"+item.uid+".png");
        var a=$("<a/>").attr("href","#").attr("onclick","return showPM('"+item.uname+"')");
        a.append(img).append(item.uname);
        if(item.MessagesCount) {
            a.append($("<div/>").attr("class","unreadcnt").text(item.MessagesCount));
        }
        var li=$("<li/>").append(a);
        ul.append(li);
    });
}

function showMessages(param) {
    currentPMUser="";
    $.getJSON('http://api.juick.com/messages?hash='+hash+'&'+param+'&callback=?').done(function(data) {
        var ul=$('<ul/>');
        ul.attr("id","msglist");
        $.each(data,function(i,item) {
            var tags="";
            if(item.tags) {
                $.each(item.tags,function(t,tag) {
                    tags+=" *<a href=\"#\" onclick=\"return showMessages('tag="+encodeURIComponent(tag)+"')\">"+tag+"</a>";
                });
            }
            var photo="";
            if(item.photo) {
                photo="<div class=\"msg-media\"><img src=\""+item.photo.small+"\"/></div>";
            }
            var li=$("<li/>").attr("class","msg").html(
                "<div class=\"msg-header\">"+
                "<div class=\"msg-menu\"></div>"+
                "<div class=\"msg-avatar\"><a href=\"#\" onclick=\"return showUser('"+item.user.uname+"')\"><img src=\"//i.juick.com/a/"+item.user.uid+".png\"/></a></div>"+
                "<div class=\"msg-uname\"><a href=\"#\" onclick=\"return showUser('"+item.user.uname+"')\">@"+item.user.uname+"</a>:"+tags+"</div>"+
                "<div class=\"msg-ts\"><a href=\"#\" onclick=\"return showThread("+item.mid+")\">"+item.timestamp+"</a></div>"+
                "</div>"+
                "<div class=\"msg-txt\">"+item.body+"</div>"+
                photo+
                "<div class=\"msg-comment\"><textarea name=\"body\" rows=\"1\" class=\"reply\" placeholder=\"Add a comment...\" onkeypress=\"postformListener(this.form,event)\"></textarea></div>"
                );
            ul.append(li);
        });
        $('#toppanel').css("display","none");
        $('#bottompanel').css("display","none");
        var content=$('#content');
        content.attr("class","");
        content.empty();
        content.append(ul);
        $(window).scrollTop(0);
    });
    return false;
}

function showUser(uname) {
    showMessages('uname='+uname);
    return false;
}

function showPM(uname) {
    var modified=false;
    $.each(lastConversations,function(i,item) {
        if(item.uname===uname && item.MessagesCount>0) {
            item.MessagesCount=0;
            modified=true;
        }
    });
    if(modified) {
        initPMUList();
    }
    
    $.getJSON('http://api.juick.com/pm?hash='+hash+'&uname='+uname+'&callback=?').done(function(data) {
        var ul=$('<ul/>');
        ul.attr("id","pmlist");
        $.each(data,function(i,item) {
            var li=$("<li/>");
            if(item.user.uid==user_id) {
                li.attr("class","pm-out");
            } else {
                li.attr("class","pm-in");
            }
            li.text(item.body);
            ul.append(li);
        });

        currentPMUser=uname;

        var toppanel=$('#toppanel');
        toppanel.css("display","block");
        toppanel.html("<h1>"+uname+"</h1>");

        var bottompanel=$('#bottompanel');
        bottompanel.html("<input type=\"text\" name=\"reply\" id=\"replypmtext\"/><input type=\"button\" value=\">\" id=\"replypmbutton\" onclick=\"return sendPM()\"/>");
        bottompanel.css("display","block");

        var content=$('#content');
        content.attr("class","withtoppanel withbottompanel");
        content.empty();
        content.append(ul);
        $(window).scrollTop($(document).height());
        $('#replypmtext').focus();
    });
    return false;
}

function sendPM() {
    var replypmtext=$('#replypmtext');
    var replypmbutton=$('#replypmbutton');
    replypmtext.prop('disabled', true);
    replypmbutton.prop('disabled', true);
    
    var body=replypmtext.val();
    
    $.ajax({
        url:"http://api.juick.com/pm",
        type:"POST",
        data:{
            hash:hash,
            uname:currentPMUser,
            body:body
        },
        success:function(data) {
            replypmtext.val("");
            $('#pmlist').append($("<li/>").attr("class","pm-out").text(body));
            $(window).scrollTop($(document).height());
        },
        error:function(jqxhr,status) {
            alert("Error: "+status);
        },
        complete:function() {
            replypmtext.removeAttr("disabled");
            replypmbutton.removeAttr("disabled");
            replypmtext.focus();
        }
    });
    return false;
}
