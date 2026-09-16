"""API 에러 응답 형태를 하나로 통일하는 곳.

DRF 기본 동작은 `raise ValidationError('문자열')`이면 응답 바디가 리스트(`["문자열"]`)로,
`raise ValidationError({'field': '문자열'})`이면 딕셔너리(`{"field": ["문자열"]}`)로 나가는 등
뷰마다 형태가 달라진다. 여기서 항상 `detail` 키가 있는 딕셔너리로 맞춰주되, 필드별 에러
키(`not_member`, `bio_goal` 등)는 프론트가 이미 그 키로 분기하고 있어 그대로 살려둔다.

처리되지 않은 예외(버그로 인한 500)는 원인을 알 수 없으면 나중에 디버깅이 불가능하므로
여기서 로그를 남기고 나서 응답을 만든다.
"""
import logging

from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)

DEFAULT_MESSAGE = '요청을 처리할 수 없습니다.'
SERVER_ERROR_MESSAGE = '서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'


def exception_handler(exc, context):
    response = drf_exception_handler(exc, context)

    if response is None:
        logger.exception('처리되지 않은 예외', exc_info=exc)
        return Response({'detail': SERVER_ERROR_MESSAGE}, status=500)

    data = response.data
    if isinstance(data, list):
        first = str(data[0]) if data else DEFAULT_MESSAGE
        response.data = {'detail': first}
    elif isinstance(data, dict) and 'detail' not in data:
        first = next(iter(data.values()), None)
        if isinstance(first, list):
            first = first[0] if first else None
        response.data = {**data, 'detail': str(first) if first else DEFAULT_MESSAGE}

    return response
