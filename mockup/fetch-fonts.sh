#!/bin/sh
# 시안용 글꼴(Gowun Batang, Gowun Dodum)을 내려받습니다. 용량이 커서 저장소에는 올리지 않습니다.
mkdir -p "$(dirname "$0")/fonts" && cd "$(dirname "$0")/fonts" || exit 1
curl -sSLo batang400.ttf https://fonts.gstatic.com/s/gowunbatang/v12/ijwSs5nhRMIjYsdSgcMa3wRhXA.ttf
curl -sSLo batang700.ttf https://fonts.gstatic.com/s/gowunbatang/v12/ijwNs5nhRMIjYsdSgcMa3wRZ4J7awg.ttf
curl -sSLo dodum.ttf https://fonts.gstatic.com/s/gowundodum/v12/3Jn5SD_00GqwlBnWc1TUJF0F.ttf
