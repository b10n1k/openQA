package OpenQA::WebAPI::Controller::API::V1::Poc;
use Mojo::Base 'OpenQA::WebAPI::Controller::API::V1', -signatures;

sub get_info ($self) {
    my $info = {
        message => 'This is a proof-of-concept API endpoint!',
        version => 1
    };

    $self->render(json => $info);
}

sub post_data ($self) {
    #my $validated_data = $self->validation->json;
    my $validated_data = $self->openapi->valid_input or return;

    my $response = {
        status => 'ok',
        received => $validated_data
    };
    $self->render(json => $response);
}

1;
