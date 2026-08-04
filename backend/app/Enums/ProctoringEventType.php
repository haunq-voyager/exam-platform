<?php

namespace App\Enums;

enum ProctoringEventType: string
{
    case NoFace = 'no_face';
    case MultipleFaces = 'multiple_faces';
    case FaceOutOfFrame = 'face_out_of_frame';
    case TabSwitch = 'tab_switch';
    case Inactive = 'inactive';
}
