<?php
header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents("php://input"), true);
if(!$data){
  http_response_code(400);
  echo json_encode(["status"=>"error","msg"=>"no data"]);
  exit;
}

$file = 'user2.1.json';
$students = json_decode(file_get_contents($file), true);

foreach($students as &$s){
  if($s['id'] === $data['id']){
    $s['score'] = $data['score'];
    break;
  }
}

file_put_contents(
  $file,
  json_encode($students, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
);

echo json_encode(["status"=>"success"]);
